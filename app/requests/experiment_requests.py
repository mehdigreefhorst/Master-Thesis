from typing import List, Optional
from pydantic import BaseModel

from app.database.entities.base_entity import PyObjectId


class GetExperiments(BaseModel):
    scraper_cluster_id: PyObjectId
    experiment_id: Optional[PyObjectId] = None


class CreateExperiment(BaseModel):
    scraper_cluster_id: PyObjectId
    prompt_id: PyObjectId
    model: str
    runs_per_unit: int = 3


class ParsePrompt(BaseModel):
    prompt_id: PyObjectId
    cluster_unit_id: PyObjectId
