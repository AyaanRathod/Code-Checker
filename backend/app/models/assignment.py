from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.models.base import Base

class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False)
    access_key = Column(String(50), unique=True, nullable=False)
    language = Column(String(20), nullable=False) # 'JAVA', 'CPP', 'C'
    deadline = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="Open") # 'Open', 'Closed', 'Archived'
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    course = relationship("Course", back_populates="assignments")
    submissions = relationship("Submission", back_populates="assignment", cascade="all, delete")
    boilerplates = relationship("Boilerplate", back_populates="assignment", cascade="all, delete")
