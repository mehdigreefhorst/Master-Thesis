
from typing import List
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.scraper_entity import ScraperEntity

class ScraperRepository(BaseRepository[ScraperEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ScraperEntity, "scraper")

    def find_by_user_id(self, user_id: str) -> List[ScraperEntity]:
        return super().find({"user_id": user_id})
    
    def find_by_id_and_user(self, user_id: str, scraper_id: List[str]) -> ScraperEntity:
        """Finds and returns individual scraper entity, but also makes sure that the scraper entity belong to the given user."""
        filter = {"user_id": user_id, "id": scraper_id}
        return super().find_one(filter)

