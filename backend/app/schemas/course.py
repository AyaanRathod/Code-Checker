from typing import Optional
from uuid import UUID
from datetime import datetime
from app.schemas.base import ORMBaseModel

class CourseBase(ORMBaseModel):
    course_code: str
    term: str
    instructor_id: UUID

class CourseCreate(CourseBase):
    pass

class CourseUpdate(ORMBaseModel):
    course_code: Optional[str] = None
    term: Optional[str] = None

class CourseInDB(CourseBase):
    id: UUID
    created_at: datetime

class CourseResponse(CourseInDB):
    pass
