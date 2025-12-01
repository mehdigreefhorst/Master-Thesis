
from typing import List
from pydantic import BaseModel

from app.database.entities.category_info import LLMLabelField

class CreateCategoryInfoRequest(BaseModel):
    category_name: str
    category_description: str
    is_public: bool= True
    labels: List[LLMLabelField]
    llm_prediction_per_label_field: List[LLMLabelField]
    multi_label_possible: bool
    