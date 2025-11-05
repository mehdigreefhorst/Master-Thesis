

from typing import List
from pydantic import BaseModel

from app.database.entities.base_entity import PyObjectId


class CreateScraperRequest(BaseModel):
    scraper_cluster_id: PyObjectId
    keywords: List[str]
    subreddits: List[str]


class CreateScraperClusterRequest(BaseModel):
    problem_description: str
    target_audience: str
