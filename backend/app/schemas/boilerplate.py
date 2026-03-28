from typing import Optional
from uuid import UUID
from datetime import datetime
from app.schemas.base import ORMBaseModel

class BoilerplateBase(ORMBaseModel):
    assignment_id: UUID
    storage_path: str
    content: Optional[str] = None

class BoilerplateCreate(BoilerplateBase):
    pass

class BoilerplateUpdate(ORMBaseModel):
    content: Optional[str] = None

class BoilerplateInDB(BoilerplateBase):
    id: UUID
    created_at: datetime

class BoilerplateResponse(BoilerplateInDB):
    pass
