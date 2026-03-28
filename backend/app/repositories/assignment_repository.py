from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base_repository import BaseRepository
from app.models.assignment import Assignment
from app.schemas.assignment import AssignmentCreate, AssignmentUpdate

class AssignmentRepository(BaseRepository[Assignment, AssignmentCreate, AssignmentUpdate]):
    """Assignment-specific repository."""

    async def get_by_access_key(self, db: AsyncSession, access_key: str) -> Optional[Assignment]:
        """Get assignment by access key (used by students)."""
        result = await db.execute(
            select(Assignment).where(Assignment.access_key == access_key)
        )
        return result.scalars().first()

assignment_repository = AssignmentRepository(Assignment)
