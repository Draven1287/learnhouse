"""API/service boundary tests. Requires the repository's supported Python/dependencies.
These mocks verify ownership queries and gates, not PostgreSQL row-lock behavior.
"""
from types import SimpleNamespace as Obj
from unittest.mock import AsyncMock
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from src.services.learningai import service
from src.services.learningai.contract import LESSON_ID, CONTENT_VERSION
from src.routers.courses.activities import learningai
from src.security.api_token_utils import get_authenticated_non_api_token_user

class Result:
    def __init__(self, value): self.value = value
    def scalars(self): return self
    def first(self): return self.value

class DB:
    def __init__(self, values):
        self.values = iter(values)
        self.statements = []
    async def execute(self, statement):
        self.statements.append(statement)
        return Result(next(self.values))

@pytest.fixture
def resources(monkeypatch):
    monkeypatch.setenv('LEARNHOUSE_LEARNINGAI_PILOT', 'true')
    activity = Obj(id=40, activity_uuid='activity_local', course_id=20, org_id=10, published=True,
                   activity_type='TYPE_CUSTOM', activity_sub_type='SUBTYPE_CUSTOM',
                   content={'learningai': {'lesson_id':LESSON_ID, 'version':1, 'content_version':CONTENT_VERSION}})
    course = Obj(id=20, org_id=10, course_uuid='course_local')
    monkeypatch.setattr(service, 'check_resource_access', AsyncMock())
    import src.services.courses.activities.activities as activities
    readable = Obj(is_locked=False, content=activity.content)
    monkeypatch.setattr(activities, 'get_activity', AsyncMock(return_value=readable))
    return activity, course, readable

@pytest.mark.asyncio
async def test_member_course_and_activity_access(resources):
    activity, course, _ = resources
    db = DB([activity, course, Obj()])
    assert await service.context(Obj(), Obj(id=1), activity.activity_uuid, db) == (activity, course)
    params = db.statements[2].compile().params
    assert 1 in params.values() and 10 in params.values()

@pytest.mark.asyncio
async def test_cross_org_member_denied(resources):
    activity, course, _ = resources
    with pytest.raises(HTTPException) as error:
        await service.context(Obj(), Obj(id=2), activity.activity_uuid, DB([activity, course, None]))
    assert error.value.status_code == 403

@pytest.mark.asyncio
async def test_mismatched_activity_course_org_denied(resources):
    activity, course, _ = resources
    course.org_id = 99
    with pytest.raises(HTTPException) as error:
        await service.context(Obj(), Obj(id=1), activity.activity_uuid, DB([activity, course]))
    assert error.value.status_code == 404

@pytest.mark.asyncio
async def test_locked_and_paid_activity_denied(resources):
    activity, course, readable = resources
    for attribute, value in [('is_locked', True), ('content', {'paid_access':False})]:
        readable.is_locked=False
        readable.content=activity.content
        setattr(readable, attribute, value)
        with pytest.raises(HTTPException) as error:
            await service.context(Obj(), Obj(id=1), activity.activity_uuid, DB([activity, course, Obj()]))
        assert error.value.status_code == 403

@pytest.mark.asyncio
async def test_attempt_query_scopes_user_and_org(resources):
    activity, course, _ = resources
    for user_id in [1, 2]:
        db = DB([None])
        assert await service.attempt(Obj(id=user_id), activity, course, db) is None
        params = db.statements[0].compile().params
        assert user_id in params.values() and 10 in params.values() and 20 in params.values() and 40 in params.values()
        assert CONTENT_VERSION in params.values()

@pytest.mark.asyncio
async def test_non_postgres_writes_fail_closed(resources, monkeypatch):
    activity, course, _ = resources
    monkeypatch.setattr(service, 'context', AsyncMock(return_value=(activity, course)))
    db = Obj(bind=Obj(dialect=Obj(name='sqlite')))
    with pytest.raises(HTTPException) as error:
        await service.write(Obj(), Obj(id=1), activity.activity_uuid, Obj(), db)
    assert error.value.status_code == 503

@pytest.mark.asyncio
async def test_read_does_not_create_attempt(resources, monkeypatch):
    activity, course, _ = resources
    monkeypatch.setattr(service, 'context', AsyncMock(return_value=(activity, course)))
    monkeypatch.setattr(service, 'attempt', AsyncMock(return_value=None))
    db = Obj(add=AsyncMock(), commit=AsyncMock())
    result = await service.read(Obj(), Obj(id=1), activity.activity_uuid, db)
    assert result['state']['revision'] == 0 and not result['state']['completed']
    db.add.assert_not_called()
    db.commit.assert_not_called()

@pytest.fixture
def api():
    app = FastAPI()
    app.include_router(learningai.router, prefix='/learningai')
    app.dependency_overrides[learningai.get_db_session] = lambda: Obj()
    return app

def test_anonymous_route_rejected(api, monkeypatch):
    # Real authentication dependency; missing bearer token must not reach state storage.
    spy = AsyncMock()
    monkeypatch.setattr(service, 'read', spy)
    with TestClient(api) as client:
        response = client.get('/learningai/activity_local/state')
    assert response.status_code in (401,403)
    spy.assert_not_called()

def test_payload_identity_and_unknown_fields_rejected(api, monkeypatch):
    api.dependency_overrides[get_authenticated_non_api_token_user] = lambda: Obj(id=1)
    api.dependency_overrides[learningai.get_db_session] = lambda: Obj()
    spy = AsyncMock()
    monkeypatch.setattr(service, 'write', spy)
    with TestClient(api) as client:
        response = client.put('/learningai/activity_local/state', json={'answers':{},'page':0,'revision':0,'user_id':2})
    assert response.status_code == 422
    spy.assert_not_called()

@pytest.mark.parametrize('token_type', ['ordinary', 'superadmin'])
@pytest.mark.parametrize('method', ['GET', 'PUT', 'POST'])
def test_api_token_cannot_impersonate_learner(api, monkeypatch, token_type, method):
    from src.db.users import APITokenUser, SuperadminAPITokenUser
    from src.security import auth
    token = APITokenUser(id=1, org_id=10) if token_type == 'ordinary' else SuperadminAPITokenUser(id=1)
    monkeypatch.setattr(auth, 'get_authenticated_user', AsyncMock(return_value=token))
    spy = AsyncMock()
    monkeypatch.setattr(service, 'read', spy)
    monkeypatch.setattr(service, 'write', spy)
    with TestClient(api) as client:
        response = client.request(method, '/learningai/activity_local/' + ('submit' if method == 'POST' else 'state'), json={'answers':{},'page':0,'revision':0} if method != 'GET' else None)
    assert response.status_code == 403
    spy.assert_not_called()

@pytest.mark.asyncio
async def test_pilot_disabled_before_resource_lookup(resources, monkeypatch):
    monkeypatch.delenv('LEARNHOUSE_LEARNINGAI_PILOT', raising=False)
    db = DB([])
    with pytest.raises(HTTPException) as error:
        await service.context(Obj(), Obj(id=1), 'fixture', db)
    assert error.value.status_code == 503 and not db.statements

@pytest.mark.parametrize('field,value', [('published',False), ('activity_type','TYPE_VIDEO')])
@pytest.mark.asyncio
async def test_unsupported_or_unpublished_activity_denied(resources, field, value):
    activity, _, _ = resources
    setattr(activity, field, value)
    with pytest.raises(HTTPException) as error:
        await service.context(Obj(), Obj(id=1), 'fixture', DB([activity]))
    assert error.value.status_code == 404

@pytest.mark.parametrize('case', ['malformed', 'expired'])
def test_invalid_session_never_reads_saved_answers(api, monkeypatch, case):
    import jwt
    from src.security.security import SECRET_KEY, ALGORITHM
    token = 'fictional.invalid.token' if case == 'malformed' else jwt.encode({'sub':'fictional-user','exp':1}, SECRET_KEY, algorithm=ALGORITHM)
    spy = AsyncMock()
    monkeypatch.setattr(service,'read',spy)
    with TestClient(api) as client:
        response=client.get('/learningai/activity_local/state',headers={'Authorization':'Bearer '+token})
    assert response.status_code in (401,403)
    spy.assert_not_called()
