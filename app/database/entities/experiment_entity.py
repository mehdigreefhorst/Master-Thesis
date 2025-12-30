

from collections import defaultdict
from enum import Enum
from typing import Any, Dict, List, Literal, Optional
import re

from pydantic import BaseModel, Field, field_validator
from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.database.entities.cluster_unit_entity import ClusterUnitPredictionCounter, LabelPredictionCounter, TokenUsageAttempt
from app.database.entities.openrouter_data_entity import Pricing
from app.database.entities.prompt_entity import PromptCategory
from app.utils.types import StatusType


LabelName = str

ValueKey = str # The value for example True in string format
ValueCount = str # How often the value has been predicted

PrevalenceDistribution = Dict[str, int]  # Keys must be strings for MongoDB compatibility
class PrevelanceUnitDistribution(BaseModel):
    """keeps track of individual predictions, how often it was labeled true. and whether the groun_truth is true"""
    value_key: Optional[ValueKey] = None
    runs_predicted: int
    is_ground_truth: bool


class CombinedPredictionResult(BaseModel):
    individual_prediction_truth_label_list: List[PrevelanceUnitDistribution] = Field(default_factory=list)

    def insert_combined_label_prediction_ground_truth(self, combined_min_true_count: bool, is_combined_ground_truth: bool):
       new_prevelance_unit = PrevelanceUnitDistribution(value_key=str(True),
                                                        runs_predicted=combined_min_true_count,
                                                        ground_truth_value=is_combined_ground_truth,
                                                        is_ground_truth=is_combined_ground_truth)
       self.individual_prediction_truth_label_list.append(new_prevelance_unit)


class PredictionResult(BaseModel):
    prevelance_distribution: Dict[ValueKey, Dict[ValueCount, int]] = Field(default_factory=dict)  # e.g. {"True": {"3": 120, "2": 40, "1": 10, "0": 100}} -> Key is number of cluster units with the specific runs that have scored true
    individual_prediction_truth_label_list: List[PrevelanceUnitDistribution] = Field(default_factory=list)
    sum_ground_truth: int = 0

    # @field_validator('prevelance_distribution')
    # @classmethod
    # def validate_numeric_keys(cls, v: Dict[str, int]) -> Dict[str, int]:
    #     """Ensure all keys are numeric strings"""
    #     for key in v.keys():
    #         if not re.match(r'^\d+$', key):
    #             raise ValueError(f"Dictionary keys must be numeric strings, got: {key}")
    #     return v
    
    def insert_cluster_unit_label_prediction_counter(self, cluster_unit_label_prediction_counter: LabelPredictionCounter, ground_truth_value: Any):
        
        for value_key, value_count in cluster_unit_label_prediction_counter.value_counter.items():
            value_key = str(value_key)
            value_count = str(value_count)
            if not self.prevelance_distribution.get(value_key):
               self.prevelance_distribution[value_key] = dict()
            
            self.prevelance_distribution[value_key][value_count] = self.prevelance_distribution[value_key].get(value_count, 0) + 1

            if str(value_key) == str(ground_truth_value):
                prediction_is_ground_truth = True
            else:
                prediction_is_ground_truth = False
            
            self.individual_prediction_truth_label_list.append(
                PrevelanceUnitDistribution(value_key=value_key, 
                                           runs_predicted=value_count, 
                                           is_ground_truth= prediction_is_ground_truth)
            )
            if prediction_is_ground_truth:
                self.sum_ground_truth += 1

    @classmethod
    def from_combined_prediction_result(cls, combined_predition_result: CombinedPredictionResult):
        """creates the prediction result from the combined prediction result."""
        prevelance_distribution: Dict[ValueKey, Dict[ValueCount, int]] = dict()
        sum_ground_truth = 0
        for combined_prediction in combined_predition_result.individual_prediction_truth_label_list:
            if combined_prediction.is_ground_truth:
                sum_ground_truth += 1
            if prevelance_distribution.get(str(combined_prediction.value_key)) is None:
                prevelance_distribution[str(combined_prediction.value_key)] = defaultdict(int)
            
            prevelance_distribution[str(combined_prediction.value_key)][str(combined_prediction.runs_predicted)] += 1
        
        return cls(
            prevelance_distribution=prevelance_distribution,
            individual_prediction_truth_label_list=combined_predition_result.individual_prediction_truth_label_list,
            sum_ground_truth=sum_ground_truth
        )
            





class AggregateResult(BaseModel):
    labels: Dict[LabelName, PredictionResult] = Field(default_factory=dict)
    combined_labels: Dict[str, CombinedPredictionResult] = Field(default_factory=dict)
    errors: Optional[List[str]] = None


    @classmethod
    def field_names(cls) -> list[str]:
        return list(cls.model_fields.keys())
    
    def get_label_prediction_result(self, label_name: str) -> PredictionResult:
        if self.labels.get(label_name) is None:
            self.labels[label_name] = PredictionResult()
        
        return self.labels.get(label_name)
    

    
    def insert_combined_labels_unit_prediction(self,  
                                               combined_label_names: List[str],
                                               prediction_is_ground_truth_combined_labels: Dict[str, bool],
                                               prediction_predicted_true_combined_labels_min_count: Dict[str, int]):
        
        for combined_label_name in combined_label_names:
            if self.combined_labels.get(combined_label_name) is None:
                self.combined_labels[combined_label_name] = CombinedPredictionResult()
            
            combined_min_true_count = prediction_predicted_true_combined_labels_min_count.get(combined_label_name, 0)
            is_combined_ground_truth = prediction_is_ground_truth_combined_labels.get(combined_label_name, False)
            self.combined_labels.get(combined_label_name).insert_combined_label_prediction_ground_truth(
                combined_min_true_count=combined_min_true_count,
                is_combined_ground_truth=is_combined_ground_truth)

    def insert_errors(self, errors: Optional[List[str]] = None):
        """inserts the errors of a list of errors coming from a cluster unit entity prediction. """
        if self.errors is None:
            self.errors = list()
            
        if errors:
            self.errors.extend(errors)
            
        
        

    
        
    

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
    
    def insert_label_prediction_counter(self, label_prediction_counter: LabelPredictionCounter, ground_truth_value: Any):
        prediction_counter = self.get_label_aggregate_result(label_prediction_counter.label_name)
        prediction_counter.insert_cluster_unit_label_prediction_counter(label_prediction_counter, ground_truth_value)
        



        
        


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
    

    def reset_aggregate_result(self):
        """sets the aggregate result to None"""
        self.aggregate_result = AggregateResult()