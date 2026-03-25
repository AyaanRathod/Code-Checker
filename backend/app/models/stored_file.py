from sqlalchemy import Column, String, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from app.models.base import Base

class StoredFile(Base):
    __tablename__ = "stored_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    submission_id = Column(UUID(as_uuid=True), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=True)
    repository_submission_id = Column(UUID(as_uuid=True), ForeignKey("repository_submissions.id", ondelete="CASCADE"), nullable=True)
    storage_path = Column(String(500), nullable=False)
    file_hash = Column(String(255), nullable=False)
    byte_size = Column(Integer, nullable=False)
    line_count = Column(Integer, nullable=False)
    fingerprint_hash = Column(JSONB, nullable=True)  # Serialized Winnowing hashes

    submission = relationship("Submission", back_populates="stored_files")
    repository_submission = relationship("RepositorySubmission", back_populates="stored_files")
