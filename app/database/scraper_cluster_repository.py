
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity

class ScraperClusterRepository(BaseRepository[ScraperClusterEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ScraperClusterEntity, "scraper_cluster")

