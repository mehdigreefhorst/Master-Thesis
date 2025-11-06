from typing import List
from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.experiment_entity import ExperimentEntity
from flask_pymongo.wrappers import Database

class ExperimentRepository(BaseRepository[ExperimentEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ExperimentEntity, "experiment")
