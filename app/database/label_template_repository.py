
from typing import List
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.label_template import LabelTemplateEntity

class LabelTemplateRepository(BaseRepository[LabelTemplateEntity]):
    def __init__(self, database: Database):
        super().__init__(database, LabelTemplateEntity, "label_template")

    
    def find_available_label_template_for_user(self, user_id: PyObjectId) -> List[LabelTemplateEntity]:
        """finds all public label_template's and the ones created by the user"""
        label_template_entities = super().find(
            {"$or": [
                {"user_id": user_id},
                {"is_public": True}
                ]
            })
        
        return label_template_entities
    

