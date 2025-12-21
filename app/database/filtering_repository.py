
from typing import List
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.filtering_entity import FilteringEntity

class FilteringRepository(BaseRepository[FilteringEntity]):
    def __init__(self, database: Database):
        super().__init__(database, FilteringEntity, "filtering")

    

