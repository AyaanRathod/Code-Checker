from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.models.base import Base


class RepositorySubmission(Base):
    __tablename__ = "repository_submissions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(255), nullable=False)  # Originally the student ID from zip, or submission UUID

    repository = relationship("Repository", back_populates="repo_submissions")
    stored_files = relationship("StoredFile", back_populates="repository_submission", cascade="all, delete")
