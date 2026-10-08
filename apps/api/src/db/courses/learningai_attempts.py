from typing import Optional
from sqlalchemy import Column, JSON, UniqueConstraint, Integer, ForeignKey
from sqlmodel import SQLModel, Field

class LearningAIAttempt(SQLModel, table=True):
    __tablename__ = "learningai_attempt"
    __table_args__ = (UniqueConstraint("user_id", "org_id", "course_id", "activity_id", "content_version", name="uq_learningai_owner_version"),)
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(sa_column=Column(Integer, ForeignKey("user.id", ondelete="CASCADE"), nullable=False))
    org_id: int = Field(sa_column=Column(Integer, ForeignKey("organization.id", ondelete="CASCADE"), nullable=False))
    course_id: int = Field(sa_column=Column(Integer, ForeignKey("course.id", ondelete="CASCADE"), nullable=False))
    activity_id: int = Field(sa_column=Column(Integer, ForeignKey("activity.id", ondelete="CASCADE"), nullable=False))
    content_version: str
    lesson_version: int = 1
    answers: dict = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    page: int = 0
    revision: int = 0
    completed: bool = False
