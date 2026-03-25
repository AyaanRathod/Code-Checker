from sqlalchemy import Column, String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.models.base import Base


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("instructors.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    language = Column(String(20), nullable=False)
    source_assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="SET NULL"), nullable=True)
    submission_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    instructor = relationship("Instructor")
    source_assignment = relationship("Assignment")
    repo_submissions = relationship("RepositorySubmission", back_populates="repository", cascade="all, delete")
