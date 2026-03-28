from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.models.base import Base

class Submission(Base):
    __tablename__ = "submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False)
    student_name_encrypted = Column(Text, nullable=True)
    student_id_encrypted = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String(20), default="Active") # 'Active', 'Archived'
    attempt_number = Column(Integer, default=1)
    is_flagged = Column(Boolean, default=False)
    review_notes = Column(Text, nullable=True)

    assignment = relationship("Assignment", back_populates="submissions")
    stored_files = relationship("StoredFile", back_populates="submission", cascade="all, delete")

    # For Comparison Results relationships
    # We will define the back_populates on ComparisonResult
