from typing import Literal
from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId


class ScrapingId(BaseModel):
    scraper_id: PyObjectId
