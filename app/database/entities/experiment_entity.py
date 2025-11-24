

from enum import Enum
from typing import Dict, List, Optional
import re

from pydantic import BaseModel, Field, field_validator
from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.utils.types import StatusType


PrevalenceDistribution = Dict[str, int]  # Keys must be strings for MongoDB compatibility
class PrevelanceUnitDistribution(BaseModel):
    """keeps track of individual predictions, how often it was labeled true. and whether the groun_truth is true"""
    runs_predicted_true: int
    ground_truth: bool

class PredictionResult(BaseModel):
    prevelance_distribution: PrevalenceDistribution = Field(default_factory=dict)  # e.g. {"3": 120, "2": 40, "1": 10, "0": 100} -> Key is number of cluster units with the specific runs that have scored true
    individual_prediction_truth_label_list: List[PrevelanceUnitDistribution] = Field(default_factory=list)
    sum_ground_truth: int = 0

    @field_validator('prevelance_distribution')
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

    @classmethod
    def field_names(cls) -> list[str]:
        return list(cls.model_fields.keys())


class ExperimentTokenStatistics(BaseModel):
    """Aggregate token usage statistics for the entire experiment"""
    total_successful_predictions: int = 0
    total_failed_attempts: int = 0
    total_tokens_used: Dict[str, int] = Field(default_factory=dict)  # e.g., {"prompt_tokens": 1000, "completion_tokens": 500, "total_tokens": 1500}
    tokens_wasted_on_failures: Dict[str, int] = Field(default_factory=dict)  # Tokens from failed attempts
    tokens_from_retries: Dict[str, int] = Field(default_factory=dict)  # Tokens from retry attempts (even if they succeeded)


class ExperimentEntity(BaseEntity):
    user_id: PyObjectId
    scraper_cluster_id: PyObjectId
    prompt_id: PyObjectId
    sample_id: PyObjectId
    model: str
    reasoning_effort: Optional[str] = None
    aggregate_result: AggregateResult = Field(default_factory=AggregateResult)
    runs_per_unit: int = 3
    status: StatusType = StatusType.Initialized
    token_statistics: ExperimentTokenStatistics = Field(default_factory=ExperimentTokenStatistics)
    
