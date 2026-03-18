from typing import Optional
from uuid import UUID
from datetime import datetime
from app.schemas.base import ORMBaseModel

class AssignmentBase(ORMBaseModel):
    course_id: UUID
    title: str
    language: str # 'JAVA', 'CPP', 'C'
    deadline: datetime
    status: str = "Open"

class AssignmentCreate(AssignmentBase):
    pass

class AssignmentUpdate(ORMBaseModel):
    title: Optional[str] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None

class AssignmentInDB(AssignmentBase):
    id: UUID
    access_key: str
    created_at: datetime

class AssignmentResponse(AssignmentInDB):
    pass
