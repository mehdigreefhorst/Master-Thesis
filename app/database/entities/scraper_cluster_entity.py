

from typing import Literal, Optional

from pydantic import BaseModel, Field
from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.utils.types import StatusType

class StageStatus(BaseModel):
    define: StatusType = StatusType.Initialized
    scraping: StatusType = StatusType.Initialized
    cluster_prep: StatusType = StatusType.Initialized
    experiment: StatusType = StatusType.Initialized
    cluster_filter: StatusType = StatusType.Initialized
    cluster_enrich: StatusType = StatusType.Initialized
    clustering: StatusType = StatusType.Initialized


class ScraperClusterEntity(BaseEntity):
    """this is the orchestrating entity that connects user to each of the other entities"""
    user_id: PyObjectId
    cluster_entity_id: Optional[PyObjectId] = None
    scraper_entity_id: Optional[PyObjectId] = None
    sample_entity_id: Optional[PyObjectId] = None
    problem_exporation_description: Optional[str] = None
    target_audience: Optional[str] = None
    stages: StageStatus = Field(default_factory=StageStatus) # Literal["initialized", "scraping", "cluster_prep" "clustering", "completed"]  # replace by status class (values = initialized, ongoing, completed, error). so each stage has one of these values
