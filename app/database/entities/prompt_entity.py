

from enum import Enum
from app.database.entities.base_entity import BaseEntity, PyObjectId


class PromptCategory(str, Enum):
    Classify_cluster_units = "classify_cluster_units"
    Rewrite_cluster_unit_standalone = "rewrite_cluster_unit_standalone"
    Summarize_prediction_notes = "summarize_prediction_notes"


class PromptEntity(BaseEntity):
    user_id: PyObjectId
    prompt: str
    category: PromptCategory
