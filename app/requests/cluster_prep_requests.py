from typing import Literal
from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId


class ScraperClusterId(BaseModel):
    scraper_cluster_id: PyObjectId
