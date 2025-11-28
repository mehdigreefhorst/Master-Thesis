from typing import List, Optional
from pydantic import BaseModel

from app.database.entities.base_entity import PyObjectId
from app.database.entities.prompt_entity import PromptCategory


class GetExperiments(BaseModel):
    scraper_cluster_id: PyObjectId
    experiment_ids: Optional[List[PyObjectId]] = None
    user_threshold: Optional[float] = None #  0-1 threshold proportion of how many runs a classification must have become true. If not set, the experiment specific one is used


class CreateExperiment(BaseModel):
    scraper_cluster_id: PyObjectId
    prompt_id: PyObjectId
    model: str
    runs_per_unit: int = 3
    threshold_runs_true: int = 1
    reasoning_effort: Optional[str]


class UpdateExperimentThreshold(BaseModel):
    experiment_id: PyObjectId
    threshold_runs_true: int = 1


class ExperimentId(BaseModel):
    experiment_id: PyObjectId


class ParsePrompt(BaseModel):
    prompt_id: PyObjectId
    cluster_unit_id: PyObjectId


class ParseRawPrompt(BaseModel):
    prompt: str
    cluster_unit_id: PyObjectId


class CreatePrompt(BaseModel):
    name: str
    system_prompt: str
    prompt: str
    category: PromptCategory


class CreateSample(BaseModel):
    scraper_cluster_id: PyObjectId
    picked_posts_cluster_unit_ids: List[PyObjectId]
    sample_size: int


class GetSampleUnits(BaseModel):
    scraper_cluster_id: PyObjectId


class GetSample(BaseModel):
    scraper_cluster_id: PyObjectId


class UpdateSample(BaseModel):
    scraper_cluster_id: PyObjectId

    