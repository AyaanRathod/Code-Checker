import asyncio
import uuid
from datetime import datetime, timedelta, timezone

from app.core.database import AsyncSessionLocal, engine, Base
from app.models.instructor import Instructor
from app.models.course import Course
from app.models.assignment import Assignment
from app.core.security import get_password_hash

async def seed_database():
    print("Seeding database...")
    # 0. Initialize Tables safely
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        from sqlalchemy import select
        result = await session.execute(select(Instructor).where(Instructor.email == "faculty@brocku.ca"))
        existing = result.scalars().first()
        
        if existing:
            print("Database already seeded! Use 'faculty@brocku.ca' and password 'password123'")
            return

        # 1. Create Instructor
        instructor = Instructor(
            username="jdoe",
            email="faculty@brocku.ca",
            password_hash=get_password_hash("password123")
        )
        session.add(instructor)
        await session.flush()

        # 2. Create Course
        course = Course(
            course_code="COSC 4P02",
            term="Fall 2026",
            instructor_id=instructor.id
        )
        session.add(course)
        await session.flush()

        # 3. Create Assignment
        # Gives a wide deadline so it's always open for testing
        deadline = datetime.now(timezone.utc) + timedelta(days=365)
        assignment = Assignment(
            course_id=course.id,
            title="A1: Sorting & Winnowing",
            language="CPP",
            deadline=deadline,
            access_key="cosc4p02-a1-test"
        )
        session.add(assignment)
        await session.commit()

        print("=====================================================")
        print("Database successfully seeded for testing!")
        print("=====================================================")
        print(f"Instructor Login  : faculty@brocku.ca")
        print(f"Instructor Pass   : password123")
        print(f"Course Created    : {course.course_code}")
        print(f"Assignment Key    : {assignment.access_key}")
        print("=====================================================")

if __name__ == "__main__":
    asyncio.run(seed_database())
