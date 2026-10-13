"""A role from another membership must not authorize this org's resources."""

from datetime import datetime

import pytest

from src.db.user_organizations import UserOrganization
from src.db.users import User
from src.security.rbac.rbac import authorization_verify_based_on_roles


@pytest.fixture
async def dual_org_user(db, org, other_org, admin_role, user_role):
    # Default Admin and User roles are global (org_id NULL). The membership
    # row, not the role row, determines which org each grant belongs to.
    admin_role.org_id = None
    user_role.org_id = None
    user = User(
        id=10, username="dual", first_name="", last_name="",
        email="dual@test.com", password="x", user_uuid="user_dual",
        creation_date=str(datetime.now()), update_date=str(datetime.now()),
    )
    db.add(user)
    for org_id, role_id in ((other_org.id, admin_role.id), (org.id, user_role.id)):
        db.add(UserOrganization(
            user_id=user.id, org_id=org_id, role_id=role_id,
            creation_date=str(datetime.now()), update_date=str(datetime.now()),
        ))
    await db.commit()
    return user


async def test_admin_role_in_other_org_cannot_edit_course_here(
    db, course, dual_org_user, mock_request,
):
    assert not await authorization_verify_based_on_roles(
        mock_request, dual_org_user.id, "update", course.course_uuid, db,
    )


async def test_admin_role_in_other_org_cannot_edit_coworker_account(
    db, regular_user, dual_org_user, mock_request,
):
    assert not await authorization_verify_based_on_roles(
        mock_request, dual_org_user.id, "update", regular_user.user_uuid, db,
    )


async def test_admin_role_in_target_org_still_can_edit_course(
    db, course, admin_user, mock_request,
):
    assert await authorization_verify_based_on_roles(
        mock_request, admin_user.id, "update", course.course_uuid, db,
    )
