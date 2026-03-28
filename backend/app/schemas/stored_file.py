from typing import Optional, Dict
from uuid import UUID
from app.schemas.base import ORMBaseModel

class StoredFileBase(ORMBaseModel):
    submission_id: UUID
    storage_path: str
    file_hash: str
    byte_size: int
    line_count: int

class StoredFileCreate(StoredFileBase):
    fingerprint_hash: Optional[dict] = None

class StoredFileUpdate(ORMBaseModel):
    pass

class StoredFileInDB(StoredFileBase):
    id: UUID
    fingerprint_hash: Optional[dict] = None

class StoredFileResponse(StoredFileInDB):
    pass
