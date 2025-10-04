
from typing import List
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity

class ScraperClusterRepository(BaseRepository[ScraperClusterEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ScraperClusterEntity, "scraper_cluster")

    def find_by_user_id(self, user_id: PyObjectId) -> List[ScraperClusterEntity]:
        return super().find({"user_id": user_id})
    
    def find_by_id_and_user(self, user_id: PyObjectId, scraper_cluster_entity_id: PyObjectId) -> ScraperClusterEntity | None:
        """Finds and returns individual entity by its id which is also part of the user_id, makes sure entity belong to the given user."""
        filter = {"user_id": user_id, "_id": scraper_cluster_entity_id}
        return super().find_one(filter)

