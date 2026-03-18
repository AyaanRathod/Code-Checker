from pydantic import BaseModel, ConfigDict
from datetime import datetime
from uuid import UUID

class ORMBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
