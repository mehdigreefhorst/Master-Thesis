
from datetime import datetime
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.openrouter_data_entity import OpenRouterDataEntity

class OpenRouterDataRepository(BaseRepository[OpenRouterDataEntity]):
    def __init__(self, database: Database):
        super().__init__(database, OpenRouterDataEntity, "openrouter_data")

    
    def find_of_today(self) -> OpenRouterDataEntity | None:
        return super().find_one({"date_added": datetime.now().strftime("%d-%m-%Y")})
