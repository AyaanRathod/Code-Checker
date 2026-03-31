from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.repositories.base_repository import BaseRepository
from app.models.instructor import Instructor
from app.schemas.instructor import InstructorCreate, InstructorUpdate

class InstructorRepository(BaseRepository[Instructor, InstructorCreate, InstructorUpdate]):
    """Instructor-specific repository."""

    async def get_by_email(self, db: AsyncSession, email: str) -> Optional[Instructor]:
        """Get instructor by email."""
        result = await db.execute(
            select(Instructor).where(Instructor.email == email)
        )
        return result.scalars().first()
        
    async def get_by_username(self, db: AsyncSession, username: str) -> Optional[Instructor]:
        """Get instructor by username."""
        result = await db.execute(
            select(Instructor).where(Instructor.username == username)
        )
        return result.scalars().first()

    async def get_by_google_id(self, db: AsyncSession, google_id: str) -> Optional[Instructor]:
        """Get instructor by Google OAuth subject ID."""
        result = await db.execute(
            select(Instructor).where(Instructor.google_id == google_id)
        )
        return result.scalars().first()

instructor_repository = InstructorRepository(Instructor)
