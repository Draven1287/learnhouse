from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel, ConfigDict, StrictInt
from src.core.events.database import get_db_session
from src.security.api_token_utils import get_authenticated_non_api_token_user
from src.services.learningai import service
from src.db.users import APITokenUser, SuperadminAPITokenUser

router = APIRouter()

async def require_learner_session(user=Depends(get_authenticated_non_api_token_user)):
    # Superadmin tokens are separate, not subclasses; their IDs are not learner IDs.
    if isinstance(user, (APITokenUser, SuperadminAPITokenUser)):
        raise HTTPException(403, "A learner session is required")
    return user


class SaveAnswers(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answers: dict
    page: StrictInt
    revision: StrictInt

@router.get("/{activity_uuid}/state")
async def state(activity_uuid: str, request: Request, user=Depends(require_learner_session), db=Depends(get_db_session)):
    return await service.read(request, user, activity_uuid, db)

@router.put("/{activity_uuid}/state")
async def save(activity_uuid: str, body: SaveAnswers, request: Request, user=Depends(require_learner_session), db=Depends(get_db_session)):
    return await service.write(request, user, activity_uuid, body, db)

@router.post("/{activity_uuid}/submit")
async def submit(activity_uuid: str, body: SaveAnswers, request: Request, user=Depends(require_learner_session), db=Depends(get_db_session)):
    return await service.write(request, user, activity_uuid, body, db, submit=True)
