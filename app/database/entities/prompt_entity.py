

from enum import Enum
from typing import Optional
from app.database.entities.base_entity import BaseEntity, PyObjectId


class PromptCategory(str, Enum):
    Classify_cluster_units = "classify_cluster_units"
    Rewrite_cluster_unit_standalone = "rewrite_cluster_unit_standalone"
    Summarize_prediction_notes = "summarize_prediction_notes"


class PromptEntity(BaseEntity):
    created_by_user_id: PyObjectId
    public_policy: bool = True
    system_prompt: str
    prompt: str
    category: PromptCategory
