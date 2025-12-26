

from enum import Enum
from typing import Dict, List, Literal, Optional
import re

from pydantic import BaseModel, Field, field_validator
from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.database.entities.cluster_unit_entity import TokenUsageAttempt
from app.database.entities.openrouter_data_entity import Pricing
from app.database.entities.prompt_entity import PromptCategory
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


class CombinedPredictionResult(PredictionResult):
    

class AggregateResult(BaseModel):
    labels: Dict[str, PredictionResult] = Field(default_factory=dict)
    combined_labels: Dict[str, CombinedPredictionResult]

    @classmethod
    def field_names(cls) -> list[str]:
        return list(cls.model_fields.keys())
    
    def get_label_prediction_result(self, label_name: str) -> PredictionResult:
        if self.labels.get(label_name) is None:
            self.labels[label_name] = PredictionResult()
        
        return self.labels.get(label_name)
        
    

class TokenUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    internal_reasoning_tokens: int = 0
    total_tokens: int = 0

    def add_token_usage_attempt(self, token_usage_attempt: TokenUsageAttempt):
        self.prompt_tokens += token_usage_attempt.tokens_used.get("prompt_tokens", 0)
        self.completion_tokens += token_usage_attempt.tokens_used.get("completion_tokens", 0)
        self.total_tokens += token_usage_attempt.tokens_used.get("total_tokens", 0)
        
        reasoning_tokens = token_usage_attempt.tokens_used.get("completion_tokens_details", {}).get("reasoning_tokens", 0)
        self.internal_reasoning_tokens += reasoning_tokens

    def add_other_token_usage(self, token_usage: "TokenUsage"):
        self.prompt_tokens += token_usage.prompt_tokens
        self.completion_tokens += token_usage.completion_tokens
        self.internal_reasoning_tokens += token_usage.internal_reasoning_tokens
        self.total_tokens += token_usage.total_tokens


class ExperimentTokenStatistics(BaseModel):
    """Aggregate token usage statistics for the entire experiment"""
    total_successful_predictions: int = 0
    total_failed_attempts: int = 0
    total_tokens_used: TokenUsage = Field(default_factory=TokenUsage)  # e.g., {"prompt_tokens": 1000, "completion_tokens": 500, "total_tokens": 1500}
    tokens_wasted_on_failures: TokenUsage = Field(default_factory=TokenUsage)  # Tokens from failed attempts
    tokens_from_retries: TokenUsage = Field(default_factory=TokenUsage)  # Tokens from retry attempts (even if they succeeded)
    
    
    

class ExperimentCost(BaseModel):
    """cost in dollar spend on experiment"""
    total: float
    completion: float
    prompt: float
    internal_reasoning: float

class ExperimentEntity(BaseEntity):
    user_id: PyObjectId
    scraper_cluster_id: PyObjectId
    prompt_id: PyObjectId
    input_id: PyObjectId
    input_type: Literal["sample", "filtering", "cluster"]
    experiment_type: PromptCategory
    label_template_id: PyObjectId
    label_template_labels: List[str] = Field(default_factory=list)
    labels_possible_values: Dict[str, List[str] | List[bool] | List[int]] = Field(default_factory=dict)
    label_template_per_label_labels: List[str] = Field(default_factory=list)
    model_id: str
    model_pricing: Optional[Pricing] = None
    experiment_cost: Optional[ExperimentCost] = None
    reasoning_effort: Optional[Literal["none", "minimal", "low", "medium", "high", "xhigh", "auto"]] = None
    aggregate_result: Optional[AggregateResult] = None # Only used when experiment_type == 
    runs_per_unit: int = 3
    threshold_runs_true: int = 1
    status: StatusType = StatusType.Initialized
    token_statistics: ExperimentTokenStatistics = Field(default_factory=ExperimentTokenStatistics)

    # @model_validator(mode="after")
    # def auto_create_aggregate_result(self):
    #     if self.aggregate_result is None:
    #         self.aggregate_result = AggregateResult()
    #     for label in self.label_template_labels:
    #         self.aggregate_result.labels[label] = PredictionResult()

    def get_label_aggregate_result(self, label_name: str) -> PredictionResult:
        if self.aggregate_result is None:
            self.aggregate_result = AggregateResult(labels=dict())
        
        return self.aggregate_result.get_label_prediction_result(label_name)


    def calculate_and_set_total_cost(self) -> float:
        """only calculates for now the completion and prompt tokens, since reasoning is priced same as completion 
        also it doesn't take caching into account :TODO Improve calculation"""
        total_cost = 0
        prompt_cost = self.token_statistics.total_tokens_used.prompt_tokens * float(self.model_pricing.prompt)
        completion_cost =self.token_statistics.total_tokens_used.completion_tokens  * float(self.model_pricing.completion)
        internal_reasoning_cost = self.token_statistics.total_tokens_used.internal_reasoning_tokens  * float(self.model_pricing.internal_reasoning)

        total_cost = prompt_cost + completion_cost

        experiment_cost = ExperimentCost(total=total_cost,
                                         completion=completion_cost,
                                         prompt=prompt_cost,
                                         internal_reasoning=internal_reasoning_cost)
        self.experiment_cost = experiment_cost
        return experiment_cost.total
    
