from typing import Optional
from uuid import UUID
from pydantic import BaseModel, EmailStr
from app.schemas.base import ORMBaseModel

class InstructorBase(ORMBaseModel):
    username: str
    email: EmailStr

class InstructorCreate(InstructorBase):
    password: str

class InstructorUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

class InstructorInDB(InstructorBase):
    id: UUID
    password_hash: str

class InstructorResponse(InstructorBase):
    id: UUID
