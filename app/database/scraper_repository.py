
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.scraper_entity import ScraperEntity

class ScraperRepository(BaseRepository[ScraperEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ScraperEntity, "scraper")
