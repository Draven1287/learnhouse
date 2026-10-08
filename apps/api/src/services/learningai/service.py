"""First-lesson state and TrailStep share the application's database transaction."""
import os
from datetime import datetime, timezone
from uuid import uuid4
from fastapi import HTTPException
from sqlmodel import select
from src.db.courses.activities import Activity
from src.db.courses.courses import Course
from src.db.courses.learningai_attempts import LearningAIAttempt
from src.db.user_organizations import UserOrganization
from src.db.users import User
from src.db.trails import Trail
from src.db.trail_runs import TrailRun, StatusEnum
from src.db.trail_steps import TrailStep
from src.security.rbac import check_resource_access, AccessAction
from .contract import LESSON, CONTENT_VERSION, ContractError, supported, transition

async def context(request, user, activity_uuid, db):
    if os.getenv("LEARNHOUSE_LEARNINGAI_PILOT") != "true":
        raise HTTPException(503, "Local LearningAI pilot is disabled")
    activity = (await db.execute(select(Activity).where(Activity.activity_uuid == activity_uuid))).scalars().first()
    if not activity or not supported(activity) or not activity.published:
        raise HTTPException(404, "Supported published lesson not found")
    course = (await db.execute(select(Course).where(Course.id == activity.course_id))).scalars().first()
    if not course or course.org_id != activity.org_id:
        raise HTTPException(404, "Course not found")
    member = (await db.execute(select(UserOrganization).where(UserOrganization.user_id == user.id, UserOrganization.org_id == course.org_id))).scalars().first()
    if not member:
        raise HTTPException(403, "Organization membership required")
    await check_resource_access(request, db, user, course.course_uuid, AccessAction.READ)
    # Activity-specific locks/groups must also be checked by the existing activity service.
    from src.services.courses.activities.activities import get_activity
    readable = await get_activity(request, activity_uuid, user, db)
    if readable.is_locked or readable.content.get("paid_access") is False:
        raise HTTPException(403, "Activity access is locked")
    return activity, course

async def attempt(user, activity, course, db):
    return (await db.execute(select(LearningAIAttempt).where(
        LearningAIAttempt.user_id == user.id, LearningAIAttempt.org_id == course.org_id,
        LearningAIAttempt.course_id == course.id, LearningAIAttempt.activity_id == activity.id,
        LearningAIAttempt.content_version == CONTENT_VERSION))).scalars().first()

def snapshot(record):
    return {"answers": record.answers if record else {}, "page": record.page if record else 0,
            "revision": record.revision if record else 0, "completed": record.completed if record else False}

async def read(request, user, activity_uuid, db):
    activity, course = await context(request, user, activity_uuid, db)
    return {"lesson": LESSON, "state": snapshot(await attempt(user, activity, course, db))}

async def write(request, user, activity_uuid, payload, db, submit=False):
    activity, course = await context(request, user, activity_uuid, db)
    # Serialize all LearningAI state/trail mutations for this learner across workers.
    # SQLite silently ignores FOR UPDATE; fail closed rather than claim safe concurrency.
    if db.bind.dialect.name != "postgresql":
        raise HTTPException(503, "LearningAI writes require PostgreSQL row locks")
    await db.execute(select(User.id).where(User.id == user.id).with_for_update())
    record = await attempt(user, activity, course, db)
    try:
        new = transition(snapshot(record), payload.answers, payload.page, payload.revision, submit)
    except ContractError as error:
        raise HTTPException(409 if "revision" in str(error) or "immutable" in str(error) else 422, str(error))
    if record is None:
        record = LearningAIAttempt(user_id=user.id, org_id=course.org_id, course_id=course.id,
                                  activity_id=activity.id, content_version=CONTENT_VERSION, lesson_version=1)
    for key, value in new.items():
        setattr(record, key, value)
    db.add(record)
    if submit:
        await complete(user, activity, course, db)
    await db.commit()
    return {"state": new}

async def complete(user, activity, course, db):
    # No intermediate commit: a failed insert rolls back answers and completion together.
    now = datetime.now(timezone.utc).isoformat()
    trail = (await db.execute(select(Trail).where(Trail.user_id == user.id, Trail.org_id == course.org_id))).scalars().first()
    if not trail:
        trail = Trail(user_id=user.id, org_id=course.org_id, trail_uuid=f"trail_{uuid4()}", creation_date=now, update_date=now)
        db.add(trail)
        await db.flush()
    run = (await db.execute(select(TrailRun).where(TrailRun.trail_id == trail.id, TrailRun.course_id == course.id, TrailRun.user_id == user.id))).scalars().first()
    if not run:
        run = TrailRun(trail_id=trail.id, course_id=course.id, org_id=course.org_id, user_id=user.id, creation_date=now, update_date=now)
        db.add(run)
        await db.flush()
    step = (await db.execute(select(TrailStep).where(TrailStep.trailrun_id == run.id, TrailStep.activity_id == activity.id, TrailStep.user_id == user.id))).scalars().first()
    if not step:
        db.add(TrailStep(trailrun_id=run.id, trail_id=trail.id, activity_id=activity.id, course_id=course.id,
                         org_id=course.org_id, user_id=user.id, complete=True, teacher_verified=False, grade="", creation_date=now, update_date=now))
        await db.flush()
    activities = (await db.execute(select(Activity.id).where(Activity.course_id == course.id))).scalars().all()
    done = (await db.execute(select(TrailStep.activity_id).where(TrailStep.trailrun_id == run.id, TrailStep.user_id == user.id, TrailStep.complete == True))).scalars().all()
    if activities and set(activities).issubset(done):
        run.status = StatusEnum.STATUS_COMPLETED
        run.update_date = now
        db.add(run)
    # Certificates/webhooks/analytics are deliberately outside this bounded local pilot.
