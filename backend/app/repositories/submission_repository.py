from typing import List
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base_repository import BaseRepository
from app.models.submission import Submission
from app.schemas.submission import SubmissionCreate, SubmissionUpdate

class SubmissionRepository(BaseRepository[Submission, SubmissionCreate, SubmissionUpdate]):
    """Submission-specific repository."""

    async def get_all_by_assignment(self, db: AsyncSession, assignment_id: UUID) -> List[Submission]:
        """Get all submissions for an assignment regardless of status."""
        result = await db.execute(
            select(Submission).where(
                Submission.assignment_id == assignment_id
            ).order_by(Submission.timestamp.asc())
        )
        return list(result.scalars().all())
        
    async def get_active_by_assignment(self, db: AsyncSession, assignment_id: UUID) -> List[Submission]:
        """Get all active submissions for an assignment."""
        result = await db.execute(
            select(Submission).where(
                Submission.assignment_id == assignment_id,
                Submission.status == 'Active'
            ).order_by(Submission.timestamp.asc(), Submission.id.asc())
        )
        return list(result.scalars().all())
        
    async def get_by_student_and_assignment(self, db: AsyncSession, student_id_encrypted: str, assignment_id: UUID) -> List[Submission]:
        """Get all submissions for an assignment by a specific student."""
        result = await db.execute(
            select(Submission).where(
                Submission.assignment_id == assignment_id,
                Submission.student_id_encrypted == student_id_encrypted
            ).order_by(Submission.timestamp.desc())
        )
        return list(result.scalars().all())

submission_repository = SubmissionRepository(Submission)
