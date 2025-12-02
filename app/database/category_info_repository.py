
from typing import List
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.category_info import CategoryInfoEntity

class CategoryInfoRepository(BaseRepository[CategoryInfoEntity]):
    def __init__(self, database: Database):
        super().__init__(database, CategoryInfoEntity, "category_info")

    
    def find_available_category_info_for_user(self, user_id: PyObjectId) -> List[CategoryInfoEntity]:
        """finds all public category_info's and the ones created by the user"""
        category_info_entities = super().find(
            {"$or": [
                {"user_id": user_id},
                {"is_public": True}
                ]
            })
        
        return category_info_entities
    

