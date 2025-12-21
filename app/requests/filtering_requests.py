


from typing import Literal, Optional
from app.database.entities.filtering_entity import FilteringFields


class FilteringRequest(FilteringFields):
    return_type: Literal["count", "cluster_units"] = "cluster_units"
    limit: Optional[int] = 1000

    
  