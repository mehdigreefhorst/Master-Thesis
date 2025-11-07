

from typing import List, Optional
from pydantic import BaseModel

from app.database.entities.base_entity import PyObjectId


class GetScrapers(BaseModel):
    scraper_cluster_id: Optional[PyObjectId] = None


class CreateScraperRequest(BaseModel):
    scraper_cluster_id: PyObjectId
    keywords: List[str]
    subreddits: List[str]


class CreateScraperClusterRequest(BaseModel):
    problem_exporation_description: str
    target_audience: str
