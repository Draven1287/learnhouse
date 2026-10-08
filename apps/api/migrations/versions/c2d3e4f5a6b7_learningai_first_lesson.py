"""Durable first-lesson answers; sandbox integration only."""
from alembic import op
import sqlalchemy as sa
revision = "c2d3e4f5a6b7"
down_revision = "b1c2d3e4f5a6"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table("learningai_attempt",
        sa.Column("id", sa.Integer(), primary_key=True),
        *[sa.Column(name, sa.Integer(), sa.ForeignKey(target, ondelete="CASCADE"), nullable=False) for name, target in [("user_id", "user.id"), ("org_id", "organization.id"), ("course_id", "course.id"), ("activity_id", "activity.id")]],
        sa.Column("content_version", sa.String(), nullable=False),
        sa.Column("lesson_version", sa.Integer(), nullable=False),
        sa.Column("answers", sa.JSON(), nullable=False),
        sa.Column("page", sa.Integer(), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("user_id", "org_id", "course_id", "activity_id", "content_version", name="uq_learningai_owner_version"))

def downgrade():
    op.drop_table("learningai_attempt")
