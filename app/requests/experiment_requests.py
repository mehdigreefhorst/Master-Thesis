from typing import List, Optional
from pydantic import BaseModel

from app.database.entities.base_entity import PyObjectId
from app.database.entities.prompt_entity import PromptCategory


class GetExperiments(BaseModel):
    scraper_cluster_id: PyObjectId
    experiment_id: Optional[PyObjectId] = None
    user_threshold: Optional[int] = None # Threshold for the prediction to be accepted for the TP rate


class CreateExperiment(BaseModel):
    scraper_cluster_id: PyObjectId
    prompt_id: PyObjectId
    model: str
    runs_per_unit: int = 3
    reasoning_effort: Optional[str]



class ParsePrompt(BaseModel):
    prompt_id: PyObjectId
    cluster_unit_id: PyObjectId


class ParseRawPrompt(BaseModel):
    prompt: str
    cluster_unit_id: PyObjectId


class CreatePrompt(BaseModel):
    system_prompt: str
    prompt: str
    category: PromptCategory


class CreateSample(BaseModel):
    scraper_cluster_id: PyObjectId
    picked_posts_cluster_unit_ids: List[PyObjectId]
    sample_size: int


class GetSampleUnits(BaseModel):
    scraper_cluster_id: PyObjectId
