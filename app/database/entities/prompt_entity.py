

from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel
from app.database import get_prompt_repository
from app.database.entities.base_entity import BaseEntity, PyObjectId


class PromptCategory(str, Enum):
    Classify_cluster_units = "classify_cluster_units"
    Rewrite_cluster_unit_standalone = "rewrite_cluster_unit_standalone"
    Summarize_prediction_notes = "summarize_prediction_notes"


class PromptEntity(BaseEntity):
    name: str = ""
    created_by_user_id: PyObjectId
    public_policy: bool = True
    system_prompt: str
    prompt: str
    category: PromptCategory


class PromptEntitiesDict(BaseModel):
    prompt_entities_dict: Dict[PyObjectId, PromptEntity]

    @classmethod
    def create_from_prompt_ids(cls, prompt_ids: List[PyObjectId]) -> "PromptEntitiesDict":
        prompt_entities_dict = {prompt_id: get_prompt_repository().find_by_id(prompt_id) for prompt_id in prompt_ids}
        return cls(prompt_entities_dict=prompt_entities_dict)
    
    def get_prompt_entity(self, prompt_id: PyObjectId) -> PromptEntity | None:
        return self.prompt_entities_dict.get(prompt_id)
    
    def get_prompt_name(self, prompt_id: PyObjectId):
        prompt_enity = self.get_prompt_entity(prompt_id=prompt_id)
        if prompt_enity is None:
            return f"Not found: prompt_id: {prompt_id}"
        else:
            return prompt_enity.name if prompt_enity.name else "No Prompt name"