from typing import List
from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.sample_entity import SampleEntity
from flask_pymongo.wrappers import Database

class SampleRepository(BaseRepository[SampleEntity]):
    def __init__(self, database: Database):
        super().__init__(database, SampleEntity, "sample")
