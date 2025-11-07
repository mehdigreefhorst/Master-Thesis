

from enum import Enum
from typing import Dict, Optional

from pydantic import BaseModel
from app.database.entities.base_entity import BaseEntity, PyObjectId


PrevalenceDict = Dict[int, int]


class PredictionResult(BaseModel):
    prevelance_dict: PrevalenceDict # e.g. {3: 120, 2: 40, 1: 10, 0: 100} -> First number is numbe of cluster units with the specific runs that have scored true  sum_ground_truth: int
    sum_ground_truth: int


class AggregateResult(BaseModel):
    problem_description: bool | None = None
    frustration_expression: bool | None = None
    solution_seeking: bool | None = None
    solution_attempted: bool | None = None
    solution_proposing: bool | None = None
    agreement_empathy: bool | None = None
    none_of_the_above: bool | None = None

    
class ExperimentEntity(BaseEntity):
    user_id: PyObjectId
    scraper_cluster_id: PyObjectId
    prompt_id: PyObjectId
    sample_id: PyObjectId
    model: str
    reasoning_effort: Optional[str]
    aggregate_result: Optional[AggregateResult]
    runs_per_unit: int = 3
