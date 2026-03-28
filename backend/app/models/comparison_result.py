from sqlalchemy import Column, ForeignKey, Numeric, DateTime, String
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.models.base import Base

class ComparisonResult(Base):
    __tablename__ = "comparison_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False)
    target_submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=True)
    target_repo_submission_id = Column(UUID(as_uuid=True), ForeignKey("repository_submissions.id", ondelete="CASCADE"), nullable=True)
    comparison_type = Column(String(20), default="internal")  # 'internal' or 'cross_repo'
    similarity_score = Column(Numeric(5, 2), nullable=False)
    match_metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    source_submission = relationship("Submission", foreign_keys=[source_submission_id])
    target_submission = relationship("Submission", foreign_keys=[target_submission_id])
    target_repo_submission = relationship("RepositorySubmission", foreign_keys=[target_repo_submission_id])
