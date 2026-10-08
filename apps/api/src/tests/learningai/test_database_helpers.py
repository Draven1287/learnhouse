"""Real SQLite fixture checks for completion helpers/migration; not row-lock proof."""
import importlib.util
from pathlib import Path
from unittest.mock import patch
import pytest
from sqlalchemy import create_engine, inspect
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlmodel import select
from src.db.trail_steps import TrailStep
from src.db.trail_runs import TrailRun, StatusEnum
from src.db.courses.learningai_attempts import LearningAIAttempt
from src.services.learningai import service
from src.services.learningai.contract import CONTENT_VERSION
from src.services.trail import trail as trail_service
from fastapi import HTTPException

@pytest.mark.asyncio
async def test_actual_completion_helper_retry(db, admin_user, activity, course):
    await service.complete(admin_user,activity,course,db)
    await db.commit()
    await service.complete(admin_user,activity,course,db)
    await db.commit()
    steps=(await db.execute(select(TrailStep).where(TrailStep.user_id==admin_user.id))).scalars().all()
    runs=(await db.execute(select(TrailRun).where(TrailRun.user_id==admin_user.id))).scalars().all()
    assert len(steps)==1 and steps[0].complete
    assert len(runs)==1 and runs[0].status==StatusEnum.STATUS_COMPLETED

@pytest.mark.asyncio
async def test_answer_and_step_rollback_together(db,admin_user,activity,course):
    db.add(LearningAIAttempt(user_id=admin_user.id,org_id=course.org_id,course_id=course.id,activity_id=activity.id,content_version=CONTENT_VERSION,answers={'practice':'fictional'},completed=True))
    await service.complete(admin_user,activity,course,db)
    await db.rollback()
    assert not (await db.execute(select(LearningAIAttempt))).scalars().all()
    assert not (await db.execute(select(TrailStep))).scalars().all()

@pytest.mark.asyncio
async def test_generic_completion_and_reset_cannot_bypass(db,admin_user,activity,course,mock_request):
    activity.activity_type='TYPE_CUSTOM'
    activity.content={'learningai':{'lesson_id':'lai.ai-you-can-use.l01'}}
    db.add(activity);await db.commit()
    for function,arg in [(trail_service.add_activity_to_trail,activity.activity_uuid),(trail_service.remove_activity_from_trail,activity.activity_uuid),(trail_service.remove_course_from_trail,course.course_uuid)]:
        with pytest.raises(HTTPException) as error:
            await function(mock_request,admin_user,arg,db)
        assert error.value.status_code==409
    assert not (await db.execute(select(TrailStep))).scalars().all()

def test_migration_upgrade_downgrade_in_fixture():
    path=Path(__file__).resolve().parents[3]/'migrations/versions/c2d3e4f5a6b7_learningai_first_lesson.py'
    spec=importlib.util.spec_from_file_location('migration_learningai',path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    engine=create_engine('sqlite://')
    with engine.begin() as conn:
        with Operations.context(MigrationContext.configure(conn)):
            module.upgrade()
            inspection=inspect(conn)
            assert 'learningai_attempt' in inspection.get_table_names()
            assert len(inspection.get_foreign_keys('learningai_attempt'))==4
            assert any(set(item['column_names'])=={'user_id','org_id','course_id','activity_id','content_version'} for item in inspection.get_unique_constraints('learningai_attempt'))
            module.downgrade()
            assert 'learningai_attempt' not in inspect(conn).get_table_names()
    engine.dispose()
