


from typing import Literal, Optional

from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId
from app.database.entities.filtering_entity import FilteringFields


class FilteringRequest(FilteringFields):
    return_type: Literal["count", "cluster_units"] = "cluster_units"
    limit: Optional[int] = 1000

class FilteringCreateRequest(BaseModel):
    filtering_fields: FilteringFields
    scraper_cluster_id: PyObjectId

    
  
class FilteringEntityId(BaseModel):
    filtering_entity_id: PyObjectId


class GetFilteringEntities(BaseModel):
    filtering_entity_id: Optional[PyObjectId] = None
    scraper_cluster_id: Optional[PyObjectId] = None
