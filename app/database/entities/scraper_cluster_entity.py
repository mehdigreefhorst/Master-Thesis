

from typing import Literal
from app.database.entities.base_entity import BaseEntity, PyObjectId


class ScraperClusterEntity(BaseEntity):
    """this is the orchestrating entity that connects user to each of the other entities"""
    user_id: PyObjectId
    cluster_entity_id: PyObjectId
    scraping_entity: PyObjectId
    stages: Literal["initialized", "scraping", "cluster_prep" "clustering", "completed"]
