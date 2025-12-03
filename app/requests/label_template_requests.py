
from typing import List, Optional
from pydantic import BaseModel

from app.database.entities.label_template import LLMLabelField

class CreateLabelTemplateRequest(BaseModel):
    category_name: str
    category_description: str
    is_public: bool= True
    labels: List[LLMLabelField]
    llm_prediction_fields_per_label: List[LLMLabelField]
    multi_label_possible: bool


class GetLabelTemplateRequest(BaseModel):
    label_template_id: Optional[str] = None
    