"""Local PostgreSQL + real HTTP routers/auth/RBAC/completion; no business mocks.

Only the DB dependency/session factory is redirected to an isolated fixture schema.
HTTPX ASGI transport exercises actual HTTP handlers, not a browser or deployed server.
"""
import asyncio
import os
from datetime import datetime, timezone, timedelta
from uuid import uuid4
from urllib.parse import urlparse

import httpx
import pytest
import pytest_asyncio
from fastapi import FastAPI
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlmodel import SQLModel, select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.core.events import database
from src.db.users import User
from src.db.user_organizations import UserOrganization
from src.db.organization_config import OrganizationConfig
from src.db.courses.activities import Activity
from src.db.courses.chapters import Chapter
from src.db.courses.learningai_attempts import LearningAIAttempt
from src.db.trails import Trail
from src.db.trail_runs import TrailRun, StatusEnum
from src.db.trail_steps import TrailStep
from src.routers.courses.activities import learningai
from src.routers import trail as trail_router
from src.security.auth import create_access_token, create_refresh_token
from src.services.learningai.contract import LESSON, LESSON_ID, CONTENT_VERSION

@pytest_asyncio.fixture
async def pg_factory(monkeypatch):
    dsn=os.getenv('LEARNINGAI_TEST_DATABASE_URL')
    if not dsn:
        pytest.skip('Disposable localhost PostgreSQL fixture required')
    parsed=urlparse(dsn)
    assert parsed.scheme=='postgresql+asyncpg' and parsed.hostname in ('localhost','127.0.0.1','::1')
    schema='lai_http_'+uuid4().hex
    admin=create_async_engine(dsn)
    async with admin.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine=create_async_engine(dsn,connect_args={'server_settings':{'search_path':schema}})
    factory=async_sessionmaker(engine,class_=AsyncSession,expire_on_commit=False)
    # The unrelated embeddings table requires pgvector, which this approved
    # disposable PostgreSQL build does not install. All other native tables stay intact.
    tables=[t for t in SQLModel.metadata.sorted_tables if t.name!='course_embedding']
    try:
        async with engine.begin() as conn:
            await conn.run_sync(lambda sync: SQLModel.metadata.create_all(sync,tables=tables))
        monkeypatch.setattr(database,'_async_session_factory',factory)
        monkeypatch.setenv('LEARNHOUSE_LEARNINGAI_PILOT','true')
        yield factory
    finally:
        await engine.dispose()
        async with admin.begin() as conn:
            await conn.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        await admin.dispose()

@pytest_asyncio.fixture
async def db(pg_factory):
    async with pg_factory() as session:
        yield session

@pytest_asyncio.fixture
async def http_fixture(pg_factory,db,regular_user,admin_user,other_org,activity,course):
    activity.activity_type='TYPE_CUSTOM'
    activity.activity_sub_type='SUBTYPE_CUSTOM'
    activity.content={'learningai':{'lesson_id':LESSON_ID,'version':1,'content_version':CONTENT_VERSION}}
    db.add(activity)
    db.add(OrganizationConfig(org_id=course.org_id,config={}))
    for uid,org_id in [(3,course.org_id),(4,other_org.id)]:
        db.add(User(id=uid,username=f'fictional_{uid}',first_name='Fictional',last_name='Learner',email=f'fictional{uid}@example.invalid',password='',user_uuid=f'user_fictional_{uid}',creation_date='2026-10-08',update_date='2026-10-08'))
    await db.commit()
    for uid,org_id in [(3,course.org_id),(4,other_org.id)]:
        db.add(UserOrganization(user_id=uid,org_id=org_id,role_id=4,creation_date='2026-10-08',update_date='2026-10-08'))
    await db.commit()
    app=FastAPI()
    app.include_router(learningai.router,prefix='/learningai')
    app.include_router(trail_router.router,prefix='/trail')
    async def sessions():
        async with pg_factory() as session:
            yield session
    app.dependency_overrides[database.get_db_session]=sessions
    headers={uid:{'Authorization':'Bearer '+create_access_token({'sub':email},expires_delta=timedelta(minutes=5))} for uid,email in [(regular_user.id,regular_user.email),(3,'fictional3@example.invalid'),(4,'fictional4@example.invalid')]}
    return app,headers,activity,course,None

def client(app,raise_errors=True):
    return httpx.AsyncClient(transport=httpx.ASGITransport(app=app,raise_app_exceptions=raise_errors),base_url='http://127.0.0.1')

def answers():
    result={a['id']:a['correctAnswer'] for a in LESSON['activities']}
    result[LESSON['transfer']['id']]='Use a fictional ten minute paper game and ask participants to check accessibility.'
    return result

def body(revision=0,complete=False):
    return {'answers':answers() if complete else {LESSON['activities'][0]['id']:'paper'},'page':3 if complete else 0,'revision':revision}

async def counts(factory):
    async with factory() as db:
        return {model.__name__:len((await db.execute(select(model))).scalars().all()) for model in (LearningAIAttempt,Trail,TrailRun,TrailStep)}

@pytest.mark.asyncio
async def test_real_session_save_resume_and_user_org_isolation(http_fixture,pg_factory):
    app,headers,activity,course,_=http_fixture
    route=f'/learningai/{activity.activity_uuid}/state'
    async with client(app) as http:
        session=headers[2]
        assert (await http.get(route,headers=session)).json()['state']['revision']==0
        saved=await http.put(route,headers=session,json=body())
        assert saved.status_code==200,saved.text
        assert saved.json()['state']['revision']==1
    # New HTTP client/request/session reads committed durable state.
    async with client(app) as http:
        resumed=await http.get(route,headers=headers[2])
        assert resumed.status_code==200 and resumed.json()['state']['answers']==body()['answers']
        assert (await http.get(route,headers=headers[3])).json()['state']['answers']=={}
        for method,suffix in [('GET','state'),('PUT','state'),('POST','submit')]:
            response=await http.request(method,f'/learningai/{activity.activity_uuid}/{suffix}',headers=headers[4],json=None if method=='GET' else body(complete=True))
            assert response.status_code==403,response.text
    assert await counts(pg_factory)=={'LearningAIAttempt':1,'Trail':0,'TrailRun':0,'TrailStep':0}

@pytest.mark.asyncio
async def test_real_http_concurrent_saves_submissions_and_completion(http_fixture,pg_factory):
    app,headers,activity,_,_=http_fixture
    async with client(app) as http:
        route=f'/learningai/{activity.activity_uuid}'
        results=await asyncio.gather(*(http.put(route+'/state',headers=headers[2],json=body()) for _ in range(2)))
        assert sorted(r.status_code for r in results)==[200,409]
        results=await asyncio.gather(*(http.post(route+'/submit',headers=headers[2],json=body(1,True)) for _ in range(2)))
        assert [r.status_code for r in results]==[200,200],[r.text for r in results]
        assert all(r.json()['state']['completed'] and r.json()['state']['revision']==2 for r in results)
        changed=await http.put(route+'/state',headers=headers[2],json=body(2))
        assert changed.status_code==409
    assert await counts(pg_factory)=={'LearningAIAttempt':1,'Trail':1,'TrailRun':1,'TrailStep':1}
    async with pg_factory() as db:
        run=(await db.execute(select(TrailRun))).scalars().one()
        step=(await db.execute(select(TrailStep))).scalars().one()
        assert run.status==StatusEnum.STATUS_COMPLETED and step.complete
        assert step.user_id==2 and step.activity_id==activity.id and step.org_id==run.org_id

@pytest.mark.asyncio
async def test_database_completion_failure_rolls_back_answers_and_trail(http_fixture,pg_factory):
    app,headers,activity,_,_=http_fixture
    async with pg_factory() as db:
        # A real PostgreSQL failure during the real completion insert, no mock.
        await db.execute(text("CREATE FUNCTION reject_fixture_step() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fictional step failure'; END $$"))
        await db.execute(text('CREATE TRIGGER fixture_step_failure BEFORE INSERT ON trailstep FOR EACH ROW EXECUTE FUNCTION reject_fixture_step()'))
        await db.commit()
    async with client(app,False) as http:
        response=await http.post(f'/learningai/{activity.activity_uuid}/submit',headers=headers[2],json=body(complete=True))
        assert response.status_code==500
        read=await http.get(f'/learningai/{activity.activity_uuid}/state',headers=headers[2])
        assert read.status_code==200 and read.json()['state']=={'answers':{},'page':0,'revision':0,'completed':False}
    assert await counts(pg_factory)=={'LearningAIAttempt':0,'Trail':0,'TrailRun':0,'TrailStep':0}

@pytest.mark.parametrize('lock_target',['activity','chapter'])
@pytest.mark.asyncio
async def test_actual_restricted_lock_denies_all_routes(http_fixture,pg_factory,lock_target):
    app,headers,activity,_,_=http_fixture
    async with pg_factory() as db:
        obj=await db.get(Activity if lock_target=='activity' else Chapter,1)
        obj.lock_type='restricted'
        db.add(obj)
        await db.commit()
    async with client(app) as http:
        for method,suffix in [('GET','state'),('PUT','state'),('POST','submit')]:
            response=await http.request(method,f'/learningai/{activity.activity_uuid}/{suffix}',headers=headers[2],json=None if method=='GET' else body(complete=True))
            assert response.status_code==403,response.text
    assert not any((await counts(pg_factory)).values())

@pytest.mark.asyncio
async def test_real_auth_validation_and_generic_completion_bypass(http_fixture,pg_factory):
    app,headers,activity,course,_=http_fixture
    invalid=[None,'fictional.invalid.token',create_access_token({'sub':'regular@test.com'},expires_delta=timedelta(seconds=-1)),create_refresh_token({'sub':'regular@test.com'})]
    async with client(app) as http:
        for token in invalid:
            for method,suffix in [('GET','state'),('PUT','state'),('POST','submit')]:
                response=await http.request(method,f'/learningai/{activity.activity_uuid}/{suffix}',headers={} if token is None else {'Authorization':'Bearer '+token},json=None if method=='GET' else body(complete=True))
                assert response.status_code==401,response.text
        for method,path in [('POST',f'/trail/add_activity/{activity.activity_uuid}'),('DELETE',f'/trail/remove_activity/{activity.activity_uuid}'),('DELETE',f'/trail/remove_course/{course.course_uuid}')]:
            response=await http.request(method,path,headers=headers[2])
            assert response.status_code==409,response.text
    assert not any((await counts(pg_factory)).values())

@pytest.mark.parametrize('kind',['ordinary','superadmin'])
@pytest.mark.asyncio
async def test_actual_valid_api_tokens_cannot_impersonate_learner(http_fixture,pg_factory,kind):
    from src.db.api_tokens import APIToken
    from src.db.superadmin_api_tokens import SuperadminAPIToken
    from src.services.api_tokens.api_tokens import generate_api_token
    from src.services.api_tokens.superadmin_api_tokens import generate_token
    app,_,activity,course,_=http_fixture
    token,prefix,hashed=(generate_api_token if kind=='ordinary' else generate_token)()
    model=APIToken if kind=='ordinary' else SuperadminAPIToken
    values={'id':2,'name':'fictional fixture','token_uuid':uuid4().hex,'token_prefix':prefix,'token_hash':hashed,'created_by_user_id':1,'expires_at':(datetime.now(timezone.utc)+timedelta(minutes=5)).isoformat()}
    if kind=='ordinary':
        values['org_id']=course.org_id
    async with pg_factory() as db:
        db.add(model(**values))
        await db.commit()
    async with client(app) as http:
        for method,suffix in [('GET','state'),('PUT','state'),('POST','submit')]:
            response=await http.request(method,f'/learningai/{activity.activity_uuid}/{suffix}',headers={'Authorization':'Bearer '+token},json=None if method=='GET' else body(complete=True))
            assert response.status_code==403,response.text
    async with pg_factory() as db:
        record=await db.get(model,2)
        if kind=='ordinary':
            assert record.last_used_at  # Real token verification ran.
        else:
            # OSS rejects enterprise credentials before verifying their hash.
            assert record.last_used_at is None
    assert not any((await counts(pg_factory)).values())

@pytest.mark.asyncio
async def test_real_course_group_rbac_and_cookie_session(http_fixture,pg_factory):
    from src.db.courses.courses import Course
    from src.db.usergroups import UserGroup
    from src.db.usergroup_resources import UserGroupResource
    from src.db.usergroup_user import UserGroupUser
    app,headers,activity,course,_=http_fixture
    async with pg_factory() as db:
        resource=await db.get(Course,course.id)
        resource.public=False
        db.add(resource)
        db.add(UserGroup(id=1,org_id=course.org_id,name='Fictional group',description='Local fixture',usergroup_uuid='usergroup_fixture'))
        await db.flush()
        db.add(UserGroupResource(usergroup_id=1,org_id=course.org_id,resource_uuid=course.course_uuid))
        db.add(UserGroupUser(usergroup_id=1,user_id=3,org_id=course.org_id))
        await db.commit()
    async with client(app) as http:
        for method,suffix in [('GET','state'),('PUT','state'),('POST','submit')]:
            response=await http.request(method,f'/learningai/{activity.activity_uuid}/{suffix}',headers=headers[2],json=None if method=='GET' else body(complete=True))
            assert response.status_code==403,response.text
        # Cookie extraction and real JWT/user lookup, through actual handler.
        http.cookies.set('LH_access',headers[3]['Authorization'][7:])
        response=await http.put(f'/learningai/{activity.activity_uuid}/state',json=body())
        assert response.status_code==200,response.text
    async with pg_factory() as db:
        record=(await db.execute(select(LearningAIAttempt))).scalars().one()
        assert record.user_id==3


@pytest.mark.asyncio
async def test_optional_vector_failure_preserves_core_bootstrap(pg_factory, monkeypatch):
    from src.core.events.schema import bootstrap_schema
    engine = pg_factory.kw['bind']
    async with engine.begin() as connection:
        available = await connection.scalar(text("SELECT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name='vector')"))
        if available:
            pytest.skip('This acceptance case requires PostgreSQL without optional pgvector')
        await connection.run_sync(bootstrap_schema)
        # Real missing-extension DDL must roll back only its savepoint.
        assert await connection.scalar(text('SELECT 1')) == 1
        assert await connection.scalar(text("SELECT to_regclass('learningai_attempt')")) is not None
        assert await connection.scalar(text("SELECT to_regclass('course_embedding')")) is None
