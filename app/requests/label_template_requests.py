
from typing import List, Literal, Optional
from pydantic import BaseModel

from app.database.entities.base_entity import PyObjectId
from app.database.entities.label_template import LLMLabelField

class CreateLabelTemplateRequest(BaseModel):
    label_template_name: str
    label_template_description: str
    is_public: bool= True
    labels: List[LLMLabelField]
    llm_prediction_fields_per_label: List[LLMLabelField]
    multi_label_possible: bool


class GetLabelTemplateRequest(BaseModel):
    label_template_id: Optional[str] = None
    

class AddLabelTemplateToSampleRequest(BaseModel):
    sample_entity_id: PyObjectId
    label_template_id: PyObjectId
    action: Literal["add", "remove"]