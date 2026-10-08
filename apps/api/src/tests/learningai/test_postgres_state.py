"""Actual durable state/concurrency tests in an isolated local PostgreSQL schema.
Run only with LEARNINGAI_TEST_DATABASE_URL=postgresql+asyncpg://...@localhost/... .
No live schema, credentials or deployment is configured by these tests.
"""
import asyncio
import os
from types import SimpleNamespace as Obj
from uuid import uuid4
from unittest.mock import AsyncMock
import pytest
import pytest_asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from src.services.learningai import service
from src.services.learningai.contract import LESSON
from src.db.courses.learningai_attempts import LearningAIAttempt

@pytest_asyncio.fixture
async def local_db(monkeypatch):
    dsn = os.getenv('LEARNINGAI_TEST_DATABASE_URL')
    if not dsn:
        pytest.skip('No disposable local PostgreSQL test database supplied')
    from urllib.parse import urlparse
    parsed = urlparse(dsn)
    if parsed.hostname not in ('localhost','127.0.0.1','::1'):
        pytest.fail('Only a local PostgreSQL fixture database is permitted')
    if parsed.scheme != 'postgresql+asyncpg':
        pytest.fail('Use the asyncpg SQLAlchemy driver')
    schema = 'lai_test_' + uuid4().hex
    admin = create_async_engine(dsn)
    async with admin.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_async_engine(dsn, connect_args={'server_settings':{'search_path':schema}})
    try:
        async with engine.begin() as conn:
            for name in ['user','organization','course','activity']:
                await conn.execute(text(f'CREATE TABLE "{name}" (id INTEGER PRIMARY KEY)'))
                await conn.execute(text(f'INSERT INTO "{name}" (id) VALUES (1), (2)'))
            await conn.run_sync(lambda sync: LearningAIAttempt.__table__.create(sync))
        activity, course = Obj(id=1), Obj(id=1,org_id=1)
        monkeypatch.setattr(service,'context',AsyncMock(return_value=(activity,course)))
        monkeypatch.setattr(service,'complete',AsyncMock())
        yield async_sessionmaker(engine,expire_on_commit=False), activity, course
    finally:
        await engine.dispose()
        async with admin.begin() as conn:
            await conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin.dispose()

def payload(revision=0):
    return Obj(answers={LESSON['activities'][0]['id']:'paper'},page=0,revision=revision)

@pytest.mark.asyncio
async def test_durable_resume_and_cross_user_scope(local_db):
    factory, activity, course = local_db
    async with factory() as db:
        await service.write(Obj(),Obj(id=1),'fixture',payload(),db)
    async with factory() as db:
        saved = await service.attempt(Obj(id=1),activity,course,db)
        assert saved.answers == payload().answers and saved.revision == 1
        assert await service.attempt(Obj(id=2),activity,course,db) is None
        assert await service.attempt(Obj(id=1),activity,Obj(id=1,org_id=2),db) is None

@pytest.mark.asyncio
async def test_concurrent_saves_one_wins(local_db):
    factory, _, _ = local_db
    async def save():
        async with factory() as db:
            try:
                await service.write(Obj(),Obj(id=1),'fixture',payload(),db)
                return 200
            except Exception as error:
                return getattr(error,'status_code',500)
    assert sorted(await asyncio.gather(save(),save())) == [200,409]

@pytest.mark.asyncio
async def test_failed_completion_does_not_persist_submission(local_db,monkeypatch):
    factory, activity, course = local_db
    monkeypatch.setattr(service,'complete',AsyncMock(side_effect=RuntimeError('simulated step insert failure')))
    answers={a['id']:a['correctAnswer'] for a in LESSON['activities']}
    answers[LESSON['transfer']['id']]='Run a ten minute paper game and ask the fictional participants about access.'
    async with factory() as db:
        with pytest.raises(RuntimeError):
            await service.write(Obj(),Obj(id=1),'fixture',Obj(answers=answers,page=3,revision=0),db,submit=True)
        await db.rollback()
    async with factory() as db:
        assert await service.attempt(Obj(id=1),activity,course,db) is None

@pytest.mark.asyncio
async def test_concurrent_submit_and_retry_same_record(local_db):
    factory, activity, course = local_db
    answers={a['id']:a['correctAnswer'] for a in LESSON['activities']}
    answers[LESSON['transfer']['id']]='Use a paper game lasting ten minutes, and ask the fictional club to check inclusion.'
    async def submit():
        async with factory() as db:
            return await service.write(Obj(),Obj(id=1),'fixture',Obj(answers=answers,page=3,revision=0),db,submit=True)
    results=await asyncio.gather(submit(),submit())
    assert all(result['state']['completed'] and result['state']['revision']==1 for result in results)
    async with factory() as db:
        record=await service.attempt(Obj(id=1),activity,course,db)
        assert record.answers==answers and record.revision==1
