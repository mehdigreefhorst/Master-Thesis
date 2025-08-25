from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId


class ScrapingCommands(BaseModel):
    scraping_instance: PyObjectId
    command: str