from datetime import datetime
from typing import Any, Mapping, Optional

from bson import ObjectId
from pydantic import BaseModel, Field

from utils import utc_timestamp

PyObjectId = str


class BaseEntity(BaseModel):
    id: PyObjectId = Field(default_factory=lambda: str(ObjectId()), alias='_id')
    created_at: datetime = Field(default_factory=utc_timestamp)
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None

    def dump_for_database(self) -> Mapping[str, Any]:
        """
        Returns data that can be directly inserted into the database.
        For now, it only causes 'id' to be serialized to '_id', but it might do more in the future.
        """
        return self.model_dump(by_alias=True)

    class Config:
        populate_by_name = True
