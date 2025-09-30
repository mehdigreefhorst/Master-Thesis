

from typing import Literal
from app.database.entities.base_entity import BaseEntity, PyObjectId


class ScraperClusterEntity(BaseEntity):
    user_id: PyObjectId
    cluster_instance_entity_id: PyObjectId
    scraping_entity: PyObjectId
    stages: Literal["initialized", "scraping", "cluster_prep" "clustering", "completed"]
