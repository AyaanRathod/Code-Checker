from typing import Optional, Dict
from decimal import Decimal
from uuid import UUID
from datetime import datetime
from app.schemas.base import ORMBaseModel

class ComparisonResultBase(ORMBaseModel):
    source_submission_id: UUID
    target_submission_id: UUID
    similarity_score: float # Pydantic often converts float to Decimal if needed, Decimal(5,2) in DB

class ComparisonResultCreate(ComparisonResultBase):
    match_metadata: Optional[dict] = None

class ComparisonResultUpdate(ORMBaseModel):
    pass

class ComparisonResultInDB(ComparisonResultBase):
    id: UUID
    match_metadata: Optional[dict] = None
    created_at: datetime

class ComparisonResultResponse(ComparisonResultInDB):
    pass
