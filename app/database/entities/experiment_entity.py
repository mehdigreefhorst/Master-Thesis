

from enum import Enum
from typing import Dict, Optional
import re

from pydantic import BaseModel, Field, field_validator
from app.database.entities.base_entity import BaseEntity, PyObjectId


PrevalenceDict = Dict[str, int]  # Keys must be strings for MongoDB compatibility


class PredictionResult(BaseModel):
    prevelance_dict: PrevalenceDict = Field(default_factory=dict)  # e.g. {"3": 120, "2": 40, "1": 10, "0": 100} -> Key is number of cluster units with the specific runs that have scored true
    sum_ground_truth: int = 0

    @field_validator('prevelance_dict')
    @classmethod
    def validate_numeric_keys(cls, v: Dict[str, int]) -> Dict[str, int]:
        """Ensure all keys are numeric strings"""
        for key in v.keys():
            if not re.match(r'^\d+$', key):
                raise ValueError(f"Dictionary keys must be numeric strings, got: {key}")
        return v


class AggregateResult(BaseModel):
    problem_description: PredictionResult = Field(default_factory=PredictionResult)
    frustration_expression: PredictionResult = Field(default_factory=PredictionResult)
    solution_seeking: PredictionResult = Field(default_factory=PredictionResult)
    solution_attempted: PredictionResult = Field(default_factory=PredictionResult)
    solution_proposing: PredictionResult = Field(default_factory=PredictionResult)
    agreement_empathy: PredictionResult = Field(default_factory=PredictionResult)
    none_of_the_above: PredictionResult = Field(default_factory=PredictionResult)

    
class ExperimentEntity(BaseEntity):
    user_id: PyObjectId
    scraper_cluster_id: PyObjectId
    prompt_id: PyObjectId
    sample_id: PyObjectId
    model: str
    reasoning_effort: Optional[str] = None
    aggregate_result: AggregateResult = Field(default_factory=AggregateResult)
    runs_per_unit: int = 3
