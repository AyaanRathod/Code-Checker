from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.schema import UniqueConstraint
import uuid
from datetime import datetime, timezone
from app.models.base import Base

class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_code = Column(String(20), nullable=False)
    term = Column(String(20), nullable=False)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("instructors.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint('course_code', 'term', 'instructor_id', name='uq_course_term_instructor'),
    )

    instructor = relationship("Instructor", back_populates="courses")
    assignments = relationship("Assignment", back_populates="course", cascade="all, delete")
