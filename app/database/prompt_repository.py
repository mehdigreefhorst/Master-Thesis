from typing import List
from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.prompt_entity import PromptEntity
from flask_pymongo.wrappers import Database

class PromptRepository(BaseRepository[PromptEntity]):
    def __init__(self, database: Database):
        super().__init__(database, PromptEntity, "prompt")

    def find_by_user_id(self, user_id: PyObjectId) -> List[PromptEntity]:
      return super().find({"created_by_user_id": user_id})
    