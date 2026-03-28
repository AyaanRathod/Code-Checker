from typing import Optional
from uuid import UUID
from datetime import datetime
from app.schemas.base import ORMBaseModel

class SubmissionBase(ORMBaseModel):
    assignment_id: UUID
    student_name_encrypted: Optional[str] = None
    student_id_encrypted: Optional[str] = None

class SubmissionCreate(SubmissionBase):
    pass

class SubmissionUpdate(ORMBaseModel):
    status: Optional[str] = None # 'Active', 'Archived'
    is_flagged: Optional[bool] = None
    review_notes: Optional[str] = None

class SubmissionInDB(SubmissionBase):
    id: UUID
    timestamp: datetime
    status: str
    attempt_number: int
    is_flagged: bool
    review_notes: Optional[str]

class SubmissionResponse(SubmissionInDB):
    pass
