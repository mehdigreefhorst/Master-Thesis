

from typing import List, Dict, Literal, Optional, Tuple
from pydantic import BaseModel, Field
from datetime import datetime
import math


from app.database import get_experiment_repository, get_prompt_repository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_entity import ClusterEntity
from app.database.entities.cluster_unit_entity import ClusterUnitEntity, ClusterUnitEntityPredictedCategory, PredictionCategoryTokens, TokenUsageAttempt
from app.database.entities.experiment_entity import ExperimentCost, ExperimentEntity, ExperimentTokenStatistics, PrevalenceDistribution, TokenUsage
from app.database.entities.filtering_entity import FilteringEntity
from app.database.entities.label_template import LabelTemplateEntity
from app.database.entities.prompt_entity import PromptEntity
from app.database.entities.sample_entity import SampleEntity
from app.utils.types import StatusType




class ConfusionMatrix(BaseModel):
    """
    Confusion matrix for binary classification.
    
    Attributes:
        tp: True Positives - correctly predicted positive cases
        fp: False Positives - incorrectly predicted as positive (actually negative)
        fn: False Negatives - incorrectly predicted as negative (actually positive)
        tn: True Negatives - correctly predicted negative cases
    """
    tp: int = Field(description="True positives")
    fp: int = Field(description="False positives")
    fn: int = Field(description="False negatives")
    tn: int = Field(description="True negatives")

    # ============== Basic Counts ==============
    
    @property
    def total(self) -> int:
        """Total number of predictions."""
        return self.tp + self.tn + self.fp + self.fn
    
    @property
    def actual_positive(self) -> int:
        """Total number of actual positive cases."""
        return self.tp + self.fn
    
    @property
    def actual_negative(self) -> int:
        """Total number of actual negative cases."""
        return self.tn + self.fp
    
    @property
    def predicted_positive(self) -> int:
        """Total number of predicted positive cases."""
        return self.tp + self.fp
    
    @property
    def predicted_negative(self) -> int:
        """Total number of predicted negative cases."""
        return self.tn + self.fn

    # ============== Simple Metrics ==============
    
    def get_accuracy(self) -> float:
        """
        Calculate accuracy: proportion of correct predictions.
        
        Formula: (TP + TN) / (TP + TN + FP + FN)
        Range: [0, 1] where 1 is perfect accuracy
        
        Note: Can be misleading for imbalanced datasets.
        
        Returns:
            Accuracy as a float between 0 and 1
        """
        if self.total == 0:
            return 0.0
        return (self.tp + self.tn) / self.total
    
    def get_precision(self) -> float:
        """
        Calculate precision (Positive Predictive Value).
        
        Answers: "When we predict positive, how often are we correct?"
        Formula: TP / (TP + FP)
        Range: [0, 1] where 1 means no false positives
        
        Use when: Cost of false positives is high (e.g., spam detection)
        
        Returns:
            Precision as a float between 0 and 1
        """
        if self.predicted_positive == 0:
            return 0.0
        return self.tp / self.predicted_positive
    
    def get_recall(self) -> float:
        """
        Calculate recall (Sensitivity, True Positive Rate).
        
        Answers: "Of all actual positives, how many did we identify?"
        Formula: TP / (TP + FN)
        Range: [0, 1] where 1 means no false negatives
        
        Use when: Cost of false negatives is high (e.g., disease detection)
        
        Returns:
            Recall as a float between 0 and 1
        """
        if self.actual_positive == 0:
            return 0.0
        return self.tp / self.actual_positive
    
    def get_specificity(self) -> float:
        """
        Calculate specificity (True Negative Rate).
        
        Answers: "Of all actual negatives, how many did we correctly identify?"
        Formula: TN / (TN + FP)
        Range: [0, 1] where 1 means no false positives among negatives
        
        Use when: Important to correctly identify negative cases
        
        Returns:
            Specificity as a float between 0 and 1
        """
        if self.actual_negative == 0:
            return 0.0
        return self.tn / self.actual_negative
    
    def get_f1_score(self) -> float:
        """
        Calculate F1 Score: harmonic mean of precision and recall.
        
        Formula: 2 * (Precision * Recall) / (Precision + Recall)
        Range: [0, 1] where 1 is perfect precision and recall
        
        Use when: Need balance between precision and recall, especially
        with imbalanced classes where accuracy is misleading.
        
        Returns:
            F1 score as a float between 0 and 1
        """
        precision = self.get_precision()
        recall = self.get_recall()
        
        if precision + recall == 0:
            return 0.0
        return 2 * (precision * recall) / (precision + recall)
    
    def get_f_beta_score(self, beta: float = 1.0) -> float:
        """
        Calculate F-beta Score: weighted harmonic mean of precision and recall.
        
        Formula: (1 + beta²) * (Precision * Recall) / (beta² * Precision + Recall)
        
        Args:
            beta: Weight of recall vs precision.
                  beta < 1: Emphasizes precision
                  beta = 1: F1 score (balanced)
                  beta > 1: Emphasizes recall
                  beta = 2: F2 score (recall twice as important)
                  beta = 0.5: F0.5 score (precision twice as important)
        
        Returns:
            F-beta score as a float between 0 and 1
        """
        precision = self.get_precision()
        recall = self.get_recall()
        
        if precision == 0 and recall == 0:
            return 0.0
        
        beta_squared = beta ** 2
        return ((1 + beta_squared) * precision * recall) / \
               (beta_squared * precision + recall)

    # ============== Error Rates ==============
    
    def get_false_positive_rate(self) -> float:
        """
        Calculate False Positive Rate (Fall-out, Type I Error Rate).
        
        Answers: "Of all actual negatives, how many did we incorrectly call positive?"
        Formula: FP / (FP + TN)
        Range: [0, 1] where 0 is no false positives
        
        Use when: Evaluating false alarm rate
        
        Returns:
            False positive rate as a float between 0 and 1
        """
        if self.actual_negative == 0:
            return 0.0
        return self.fp / self.actual_negative
    
    def get_false_negative_rate(self) -> float:
        """
        Calculate False Negative Rate (Miss Rate, Type II Error Rate).
        
        Answers: "Of all actual positives, how many did we miss?"
        Formula: FN / (FN + TP)
        Range: [0, 1] where 0 is no false negatives
        
        Complement of recall: FNR = 1 - Recall
        
        Returns:
            False negative rate as a float between 0 and 1
        """
        if self.actual_positive == 0:
            return 0.0
        return self.fn / self.actual_positive
    
    def get_false_discovery_rate(self) -> float:
        """
        Calculate False Discovery Rate.
        
        Answers: "Of all positive predictions, what fraction was incorrect?"
        Formula: FP / (FP + TP)
        Range: [0, 1] where 0 means all positive predictions were correct
        
        Complement of precision: FDR = 1 - Precision
        
        Returns:
            False discovery rate as a float between 0 and 1
        """
        if self.predicted_positive == 0:
            return 0.0
        return self.fp / self.predicted_positive
    
    def get_false_omission_rate(self) -> float:
        """
        Calculate False Omission Rate.
        
        Answers: "Of all negative predictions, what fraction was incorrect?"
        Formula: FN / (FN + TN)
        Range: [0, 1] where 0 means all negative predictions were correct
        
        Complement of NPV: FOR = 1 - NPV
        
        Returns:
            False omission rate as a float between 0 and 1
        """
        if self.predicted_negative == 0:
            return 0.0
        return self.fn / self.predicted_negative

    # ============== Predictive Values ==============
    
    def get_positive_predictive_value(self) -> float:
        """
        Calculate Positive Predictive Value (same as Precision).
        
        Answers: "If test is positive, what's the probability of having the condition?"
        Formula: TP / (TP + FP)
        
        Note: Affected by prevalence of positive class in population.
        
        Returns:
            PPV as a float between 0 and 1
        """
        return self.get_precision()
    
    def get_negative_predictive_value(self) -> float:
        """
        Calculate Negative Predictive Value.
        
        Answers: "If test is negative, what's the probability of not having the condition?"
        Formula: TN / (TN + FN)
        Range: [0, 1] where 1 means perfect negative predictions
        
        Important in: Medical screening where ruling out disease is crucial
        
        Returns:
            NPV as a float between 0 and 1
        """
        if self.predicted_negative == 0:
            return 0.0
        return self.tn / self.predicted_negative

    # ============== Balanced Metrics ==============
    
    def get_balanced_accuracy(self) -> float:
        """
        Calculate Balanced Accuracy: average of sensitivity and specificity.
        
        Formula: (Sensitivity + Specificity) / 2
        Range: [0, 1] where 1 is perfect balanced accuracy
        
        Superior to accuracy for imbalanced datasets as it gives equal
        weight to both classes regardless of their frequency.
        
        Returns:
            Balanced accuracy as a float between 0 and 1
        """
        return (self.get_recall() + self.get_specificity()) / 2
    
    def get_geometric_mean(self) -> float:
        """
        Calculate Geometric Mean of sensitivity and specificity.
        
        Formula: √(Sensitivity × Specificity)
        Range: [0, 1] where 1 indicates perfect classification
        
        Use when: Need a single metric that requires good performance on both classes.
        Zero if either sensitivity or specificity is zero.
        
        Returns:
            Geometric mean as a float between 0 and 1
        """
        return math.sqrt(self.get_recall() * self.get_specificity())

    # ============== Correlation Metrics ==============
    
    def get_matthews_correlation_coefficient(self) -> float:
        """
        Calculate Matthews Correlation Coefficient (MCC).
        
        Formula: (TP×TN - FP×FN) / √[(TP+FP)(TP+FN)(TN+FP)(TN+FN)]
        Range: [-1, 1] where:
            +1 = perfect prediction
             0 = random prediction
            -1 = total disagreement
        
        Regarded as one of the best single-value metrics for binary classification,
        especially for imbalanced datasets. Takes all four confusion matrix
        values into account.
        
        Returns:
            MCC as a float between -1 and 1
        """
        numerator = (self.tp * self.tn) - (self.fp * self.fn)
        denominator = math.sqrt(
            (self.tp + self.fp) * 
            (self.tp + self.fn) * 
            (self.tn + self.fp) * 
            (self.tn + self.fn)
        )
        
        if denominator == 0:
            return 0.0
        return numerator / denominator
    
    def get_phi_coefficient(self) -> float:
        """
        Calculate Phi Coefficient (mean square contingency coefficient).
        
        For 2×2 confusion matrix, Phi equals Matthews Correlation Coefficient.
        Range: [-1, 1] for 2×2 matrices
        
        Measures association between predicted and actual classifications.
        
        Returns:
            Phi coefficient as a float between -1 and 1
        """
        return self.get_matthews_correlation_coefficient()

    # ============== Agreement Metrics ==============
    
    def get_cohens_kappa(self) -> float:
        """
        Calculate Cohen's Kappa: agreement correcting for chance agreement.
        
        Formula: (P_o - P_e) / (1 - P_e)
        Where P_o = observed agreement, P_e = expected chance agreement
        
        Range: [-1, 1] where:
            < 0: Less agreement than chance
            = 0: Agreement equal to chance
            > 0: Agreement better than chance
            = 1: Perfect agreement
        
        Interpretation (Landis & Koch):
            < 0.00: Poor
            0.00-0.20: Slight
            0.21-0.40: Fair
            0.41-0.60: Moderate
            0.61-0.80: Substantial
            0.81-1.00: Almost perfect
        
        Returns:
            Cohen's Kappa as a float between -1 and 1
        """
        if self.total == 0:
            return 0.0
        
        observed_agreement = (self.tp + self.tn) / self.total
        
        # Expected agreement by chance
        expected_positive = (self.actual_positive * self.predicted_positive) / self.total
        expected_negative = (self.actual_negative * self.predicted_negative) / self.total
        expected_agreement = (expected_positive + expected_negative) / self.total
        
        if expected_agreement == 1:
            return 1.0 if observed_agreement == 1 else 0.0
        
        return (observed_agreement - expected_agreement) / (1 - expected_agreement)

    # ============== Information-Theoretic Metrics ==============
    
    def get_informedness(self) -> float:
        """
        Calculate Informedness (Bookmaker Informedness, Youden's J statistic).
        
        Formula: Sensitivity + Specificity - 1 = TPR - FPR
        Range: [-1, 1] where:
            +1 = perfect prediction
             0 = random prediction
            -1 = all predictions wrong
        
        Measures how informed a predictor is for the specified condition,
        accounting for both sensitivity and specificity.
        
        Returns:
            Informedness as a float between -1 and 1
        """
        return self.get_recall() + self.get_specificity() - 1
    
    def get_markedness(self) -> float:
        """
        Calculate Markedness (deltaP).
        
        Formula: PPV + NPV - 1
        Range: [-1, 1] where:
            +1 = perfect prediction
             0 = random prediction
            -1 = all predictions wrong
        
        Measures how marked (distinct) the predictions are,
        accounting for both positive and negative predictive values.
        
        Returns:
            Markedness as a float between -1 and 1
        """
        return self.get_positive_predictive_value() + \
               self.get_negative_predictive_value() - 1

    # ============== Diagnostic/Medical Metrics ==============
    
    def get_diagnostic_odds_ratio(self) -> Optional[float]:
        """
        Calculate Diagnostic Odds Ratio (DOR).
        
        Formula: (TP × TN) / (FP × FN) = PLR / NLR
        Range: [0, ∞] where:
            > 1: Test has discriminatory ability
            = 1: Test has no discriminatory ability
            < 1: Test is worse than random
            
        Used in medical testing to measure diagnostic test performance.
        Higher values indicate better test performance.
        
        Returns:
            DOR as a positive float, None if undefined (FP or FN is 0),
            inf if both FP and FN are 0 (perfect test)
        """
        if self.fp == 0 and self.fn == 0:
            return float('inf')
        if self.fp == 0 or self.fn == 0:
            return None  # Undefined
        return (self.tp * self.tn) / (self.fp * self.fn)
    
    def get_positive_likelihood_ratio(self) -> Optional[float]:
        """
        Calculate Positive Likelihood Ratio (LR+).
        
        Formula: Sensitivity / (1 - Specificity) = TPR / FPR
        Range: [0, ∞] where:
            > 10: Strong evidence for positive outcome
            5-10: Moderate evidence for positive outcome
            2-5: Weak evidence for positive outcome
            1-2: Minimal evidence for positive outcome
            = 1: No diagnostic value
            
        Answers: "How much more likely is a positive test in someone with
        the condition compared to someone without?"
        
        Returns:
            PLR as a positive float, None if specificity = 1 (FPR = 0)
        """
        fpr = self.get_false_positive_rate()
        if fpr == 0:
            return float('inf') if self.get_recall() > 0 else None
        return self.get_recall() / fpr
    
    def get_negative_likelihood_ratio(self) -> Optional[float]:
        """
        Calculate Negative Likelihood Ratio (LR-).
        
        Formula: (1 - Sensitivity) / Specificity = FNR / TNR
        Range: [0, ∞] where:
            < 0.1: Strong evidence against positive outcome
            0.1-0.2: Moderate evidence against positive outcome
            0.2-0.5: Weak evidence against positive outcome
            0.5-1: Minimal evidence against positive outcome
            = 1: No diagnostic value
            
        Answers: "How much less likely is a negative test in someone with
        the condition compared to someone without?"
        
        Returns:
            NLR as a positive float, None if specificity = 0
        """
        specificity = self.get_specificity()
        if specificity == 0:
            return None
        return self.get_false_negative_rate() / specificity

    # ============== Prevalence-Dependent Metrics ==============
    
    def get_prevalence(self) -> float:
        """
        Calculate prevalence: proportion of positive cases in dataset.
        
        Formula: (TP + FN) / Total
        Range: [0, 1]
        
        Important for understanding dataset balance and interpreting
        predictive values (PPV and NPV are prevalence-dependent).
        
        Returns:
            Prevalence as a float between 0 and 1
        """
        if self.total == 0:
            return 0.0
        return self.actual_positive / self.total
    
    def get_bias(self) -> float:
        """
        Calculate prediction bias (tendency to predict positive).
        
        Formula: (TP + FP) / (TP + FN)
        Range: [0, ∞] where:
            = 1: Unbiased (predicts positive at same rate as actual)
            > 1: Over-predicting positive class
            < 1: Under-predicting positive class
            
        Returns:
            Bias as a positive float
        """
        if self.actual_positive == 0:
            return float('inf') if self.predicted_positive > 0 else 0.0
        return self.predicted_positive / self.actual_positive

    # ============== Composite Score Metrics ==============
    
    def get_threat_score(self) -> float:
        """
        Calculate Threat Score (Critical Success Index, Jaccard Index).
        
        Formula: TP / (TP + FP + FN)
        Range: [0, 1] where 1 is perfect score
        
        Used in meteorology for rare event prediction (e.g., tornado warnings).
        Ignores true negatives, focusing on positive predictions and actual positives.
        
        Returns:
            Threat score as a float between 0 and 1
        """
        denominator = self.tp + self.fp + self.fn
        if denominator == 0:
            return 0.0
        return self.tp / denominator
    
    def get_fowlkes_mallows_index(self) -> float:
        """
        Calculate Fowlkes-Mallows Index.
        
        Formula: √(Precision × Recall) = √(PPV × TPR)
        Range: [0, 1] where 1 indicates perfect classification
        
        Geometric mean of precision and recall, used in clustering evaluation.
        
        Returns:
            FM index as a float between 0 and 1
        """
        return math.sqrt(self.get_precision() * self.get_recall())

    # ============== Utility Method ==============
    
    def get_all_metrics(self) -> Dict[str, float]:
        """
        Calculate all available metrics at once.
        
        Returns:
            Dictionary with metric names as keys and values as floats.
            Excludes None values from metrics that can be undefined.
        """
        metrics = {
            # Basic metrics
            'accuracy': self.get_accuracy(),
            'precision': self.get_precision(),
            'recall': self.get_recall(),
            'specificity': self.get_specificity(),
            'f1_score': self.get_f1_score(),
            'f2_score': self.get_f_beta_score(beta=2.0),
            'f0.5_score': self.get_f_beta_score(beta=0.5),
            
            # Error rates
            'false_positive_rate': self.get_false_positive_rate(),
            'false_negative_rate': self.get_false_negative_rate(),
            'false_discovery_rate': self.get_false_discovery_rate(),
            'false_omission_rate': self.get_false_omission_rate(),
            
            # Predictive values
            'positive_predictive_value': self.get_positive_predictive_value(),
            'negative_predictive_value': self.get_negative_predictive_value(),
            
            # Balanced metrics
            'balanced_accuracy': self.get_balanced_accuracy(),
            'geometric_mean': self.get_geometric_mean(),
            
            # Correlation metrics
            'matthews_correlation_coefficient': self.get_matthews_correlation_coefficient(),
            'phi_coefficient': self.get_phi_coefficient(),
            
            # Agreement metrics
            'cohens_kappa': self.get_cohens_kappa(),
            
            # Information metrics
            'informedness': self.get_informedness(),
            'markedness': self.get_markedness(),
            
            # Composite scores
            'threat_score': self.get_threat_score(),
            'fowlkes_mallows_index': self.get_fowlkes_mallows_index(),
            
            # Dataset characteristics
            'prevalence': self.get_prevalence(),
            'bias': self.get_bias(),
            
            # Counts
            'total_samples': self.total,
            'true_positives': self.tp,
            'false_positives': self.fp,
            'false_negatives': self.fn,
            'true_negatives': self.tn,
        }
        
        # Add diagnostic metrics (may be None or inf)
        dor = self.get_diagnostic_odds_ratio()
        if dor is not None:
            metrics['diagnostic_odds_ratio'] = dor
            
        plr = self.get_positive_likelihood_ratio()
        if plr is not None:
            metrics['positive_likelihood_ratio'] = plr
            
        nlr = self.get_negative_likelihood_ratio()
        if nlr is not None:
            metrics['negative_likelihood_ratio'] = nlr
        
        return metrics
    



class PredictionMetric(BaseModel):
    prediction_category_name: str
    prevalence: float
    prevalence_count: int # how often it is seen
    total_samples: int # total samples in sample
    accuracy: float # accuracy metric prevelance relating to ground truth. Is dependend on threshold correct
    kappa: float
    prevelance_distribution: PrevalenceDistribution
    confusion_matrix: ConfusionMatrix
    


class GetExperimentsResponse(BaseModel):
    id: str
    name: str
    model: str
    prompt_id: str
    created: datetime
    runs_per_unit: int
    label_template_id: PyObjectId
    threshold_runs_true: Optional[int]
    total_samples: int
    overall_accuracy: Optional[float] = None
    overall_kappa: Optional[float] = None
    prediction_metrics: Optional[List[PredictionMetric]] = None
    reasoning_effort: Literal["none", "minimal", "low", "medium", "high", "xhigh", "auto"]
    token_statistics: Optional[ExperimentTokenStatistics] = None
    experiment_cost: Optional[ExperimentCost] = None
    status: StatusType


class ClusterEntityInputCount(ClusterEntity):
    count_cluster_units: int


class InputEntitiesExperimentsResponse(BaseModel):
    filtering_entities: List[FilteringEntity]
    sample_entity: List[SampleEntity]
    cluster_entity: Optional[List[ClusterEntityInputCount]] = None

    def insert_cluster_entity_unit_count(self, 
                                         cluster_entity: ClusterEntity,
                                         count_cluster_units=int):
        input_entity = cluster_entity.model_dump()
        input_entity["count_cluster_units"] = count_cluster_units
        self.cluster_entity = [ClusterEntityInputCount.model_validate(input_entity)]

class SinglePredictionOutputFormat(BaseModel):
    system_prompt: Optional[str] = None
    input_prompt: Optional[str] = None
    model_output_message: Optional[str] = None
    error: Optional[List[str]] = None
    success: Optional[bool] = None
    parsed_categories: Optional[PredictionCategoryTokens] = None
    all_attempts_token_usage: Optional[List[TokenUsageAttempt]] = None
    tokens_used: Optional[Dict] = None

    def insert_error(self, error_message: str):
        if self.error is None:
            self.error = list()

        self.error.append(error_message)
    
    def insert_parsed_categories(self, parsed_categories: PredictionCategoryTokens):
        self.parsed_categories = parsed_categories
    

    def insert_system_prompt(self, system_prompt: str):
        self.system_prompt = system_prompt
    
    def insert_input_prompt(self, input_prompt: str):
        self.input_prompt = input_prompt
    
    def insert_model_output_message(self, model_output_message: str):
        self.model_output_message = model_output_message
    
    def insert_model_tokens(self, tokens_used):
        self.tokens_used = tokens_used

    def set_success(self, success_or_fail: Literal["fail", "success"]):
        if success_or_fail == "fail":
            self.success = False
        
        if success_or_fail == "success":
            self.success = True


    def prediction_done_succesfully(self):
        """:TODO this could also validate whether the label template projection is in correct format. but it currently
        just sends whether the self.success is true"""
        return self.success
    
    


class GroupedPredictionOutputFormat(BaseModel):
    cluster_unit_entity: ClusterUnitEntity
    predictions: List[SinglePredictionOutputFormat]

    def all_predictions_successfull(self):
        for prediction in self.predictions:
            if prediction.parsed_categories is None:
                return False
            elif not prediction.prediction_done_succesfully():
                return False
        # Nothing triggered a fail so we send true!
        return True
    
    def get_parsed_categories(self) -> List[PredictionCategoryTokens]:
        if not self.all_predictions_successfull():
            return None
        return [prediction.parsed_categories for prediction in self.predictions]
        

    def create_set_predicted_category(self, experiment_entity: ExperimentEntity) -> ClusterUnitEntityPredictedCategory:
        if not self.all_predictions_successfull():
            return None
        
        cluster_unit_predicted_category = ClusterUnitEntityPredictedCategory(
                experiment_id=experiment_entity.id,
                predicted_categories=self.get_parsed_categories()
                )
        
        if self.cluster_unit_entity.predicted_category is None:
            self.cluster_unit_entity.predicted_category = {}
                
        self.cluster_unit_entity.predicted_category[experiment_entity.id] = cluster_unit_predicted_category

        return cluster_unit_predicted_category
    
    def get_total_tokens_used(self):
        """gets the tokens from """
        total_token_usage = TokenUsage()
        for prediction in self.predictions:
            for attempt_token_usage in prediction.all_attempts_token_usage:
                total_token_usage.add_token_usage_attempt(attempt_token_usage)
        
        return total_token_usage
                    
                    
            
        
        

        


ClusterUnitEntityId = str

class PredictionsGroupedOutputFormat(BaseModel):
    cluster_unit_predictions_map: Dict[ClusterUnitEntityId, GroupedPredictionOutputFormat]

    
    def get_count_successful_failure_predictions(self) -> Tuple[int, int]:
        """returns success_count, failed_count of predictions"""
        success_count = 0
        failed_count = 0
        for cluster_unit_id,  cluster_unit_predictions_map in  self.cluster_unit_predictions_map.items():
            if cluster_unit_predictions_map.all_predictions_successfull():
                success_count += 1
            else:
                failed_count += 1
            
        return success_count, failed_count
    
    
    @classmethod
    def parse_from_predicted_units(cls, 
                                   list_predictions_output_format: List[SinglePredictionOutputFormat],
                                    cluster_unit_enities: List[ClusterUnitEntity],
                                    runs_per_unit: int) ->"PredictionsGroupedOutputFormat":
        
        cluster_unit_predictions_map: Dict[ClusterUnitEntityId, GroupedPredictionOutputFormat] = dict()
        grouped_predicted_categories = [list_predictions_output_format[i:runs_per_unit+i] 
                                        for i in range(0, len(cluster_unit_enities)* runs_per_unit, runs_per_unit)]
        
        zipped_units_grouped_predictions = zip(cluster_unit_enities, grouped_predicted_categories)
        for cluster_unit_entity, grouped_predictions in zipped_units_grouped_predictions:
            cluster_unit_predictions_map[cluster_unit_entity.id] = GroupedPredictionOutputFormat(
                cluster_unit_entity=cluster_unit_entity,
                predictions=grouped_predictions)

        return cls(cluster_unit_predictions_map=cluster_unit_predictions_map)
    

    def get_single_predictions_output_format(self) -> List[List[SinglePredictionOutputFormat]]:
        """returns nested list of single prediction output format -> grouped per cluster unit entity"""
        return [[prediction.model_dump() for prediction in grouped_prediction.predictions] 
                for grouped_prediction in self.cluster_unit_predictions_map.values()]
    

    def get_wasted_tokens(self):
        total_wasted_tokens = TokenUsage()
        for cluster_unit_id, cluster_unit_predictions_map in self.cluster_unit_predictions_map.items():
            if not cluster_unit_predictions_map.all_predictions_successfull():
                token_usage = cluster_unit_predictions_map.get_total_tokens_used()
                total_wasted_tokens.add_other_token_usage(token_usage)

        return total_wasted_tokens
            


class ExperimentModelInformation(BaseModel):
    experiment_id: PyObjectId
    prompt_id: PyObjectId
    prompt_name: str 
    model_id: str # model_id from openrouter
    label_template_id: PyObjectId
    runs_per_unit: int
    version:str


class LabelResult(BaseModel):
    count_match_ground_truth: int #; // How many runs matched groun (0-3)
    total_runs: int #; // Total runs (default 3)
    reasons: Optional[List[str]] = None
    per_label_labels: Optional[Dict[str, List[str | bool | int | float]]] = None


class SingleUnitOneLabelAllExperiments(BaseModel):
    """For a single cluster unit, for a single label, all the experiment predictions including the ground truth"""
    label_name: str
    ground_truth: bool | str | None
    results: List[LabelResult | None] = Field(default_factory=list)

LabelName = str
class ExperimentAllPredictedData(BaseModel):
    """all experiment data for one cluster unit entity, formatted for user interface"""
    cluster_unit_enity: ClusterUnitEntity
    label_name_predicted_data: List[SingleUnitOneLabelAllExperiments] = Field(default_factory=list)



class PromptEntitiesDict(BaseModel):
    prompt_entities_dict: Dict[PyObjectId, PromptEntity]

    @classmethod
    def create_from_prompt_ids(cls, prompt_ids: List[PyObjectId]) -> "PromptEntitiesDict":
        prompt_entities_dict = {prompt_id: get_prompt_repository().find_by_id(prompt_id) for prompt_id in prompt_ids}
        return cls(prompt_entities_dict=prompt_entities_dict)
    
    def get_prompt_entity(self, prompt_id: PyObjectId) -> PromptEntity | None:
        return self.prompt_entities_dict.get(prompt_id)
    
    def get_prompt_name(self, prompt_id: PyObjectId):
        prompt_enity = self.get_prompt_entity(prompt_id=prompt_id)
        if prompt_enity is None:
            return f"Not found: prompt_id: {prompt_id}"
        else:
            return prompt_enity.name if prompt_enity.name else "No Prompt name"

class GetSampleUnitsLabelingFormatResponse(BaseModel):
    all_experiments_model_information: List[ExperimentModelInformation] = Field(default_factory=list) # all with the same label_template_id
    completed_insert_model_information: bool = False
    label_names: List[LabelName] = Field(default_factory=list)
    labels_possible_values: Dict[str, List[str] | List[bool] | List[int]] = Field(default_factory=dict)
    per_label_names: List[LabelName] = Field(default_factory=list)
    experiment_unit_data: List[ExperimentAllPredictedData] = Field(default_factory=list) # List of cluster_units with experiment data



    def insert_model_information(self, cluster_unit_entities: List[ClusterEntity], label_template: LabelTemplateEntity):
        
        # build the experiment_entities_dict, based on which experiments have been done across all cluster units, from a specific label_template_id 
        experiment_entity_ids = {experiment_id for cluster_unit in cluster_unit_entities for experiment_id in cluster_unit.get_experiment_ids(filter_label_template_id=label_template.id)}
        experiment_entities_dict = {experiment_id: get_experiment_repository().find_by_id(experiment_id) for experiment_id in experiment_entity_ids}
        experiment_entities_dict: Dict[PyObjectId, ExperimentEntity] = {experiment_id: experiment for experiment_id, experiment in experiment_entities_dict.items() if experiment}

        all_label_template_ids = list({experiment.label_template_id for experiment in experiment_entities_dict.values()})
        if len(all_label_template_ids) >1:
            raise Exception(f"experiments do not all have the same label_template ids, wrong! label_template_ids: {all_label_template_ids}")
        
        prompt_ids = {experiment.prompt_id for experiment in experiment_entities_dict.values()}
        prompt_entities_dict = PromptEntitiesDict.create_from_prompt_ids(prompt_ids=prompt_ids)
        
        # sort the experiments, so that the model information list is built from increasing order of creation date
        experiments_sorted = sorted([experiment for experiment in experiment_entities_dict.values() if experiment], key=lambda x: x.created_at)
        # insert into self.labels the labels of the first experiment, all experiments have the same label_template so the labels are the same for all experiments
        self.label_names = label_template.get_labels()
        self.per_label_names = label_template.get_per_label_labels()
        self.labels_possible_values = label_template.get_labels_possible_values()
        for index, experiment in enumerate(experiments_sorted):
            experiment_model_information = ExperimentModelInformation(
                experiment_id = experiment.id,
                prompt_id= experiment.prompt_id,
                prompt_name=prompt_entities_dict.get_prompt_name(experiment.prompt_id),
                model_id=experiment.model_id,
                label_template_id=experiment.label_template_id,
                runs_per_unit=experiment.runs_per_unit,
                version= f"V{index+1}"
            )
            print(self.all_experiments_model_information)
            self.all_experiments_model_information.append(experiment_model_information)
        
        self.completed_insert_model_information = True

    def insert_cluster_unit_experiment_data(self, cluster_unit_entities: List[ClusterUnitEntity], label_template: LabelTemplateEntity):
        """inserts the predicted data into the correct format so that we have correct formatted data about how often cluster units
        predicted data is the same as the ground truth. It does this per labelName, so the format is outputted for the table format of the user interface"""
        if not self.completed_insert_model_information:
            raise Exception("You first must insert model information before inserting experiment data")
        
        for cluster_unit in cluster_unit_entities:
            experiment_predicted_data: ExperimentAllPredictedData = ExperimentAllPredictedData(cluster_unit_enity=cluster_unit)
            for label_name in self.label_names:
                one_label_experiment_data: SingleUnitOneLabelAllExperiments = SingleUnitOneLabelAllExperiments(label_name=label_name,
                                                                                                               ground_truth=cluster_unit.get_value_of_ground_truth_variable(
                                                                                                                   label_template_id=label_template.id,
                                                                                                                   variable_name=label_name)
                                                                                                                   )
                for experiment_model_information in self.all_experiments_model_information:
                    cluster_unit.predicted_category
                    label_result: LabelResult = LabelResult(total_runs=experiment_model_information.runs_per_unit,
                                                            count_match_ground_truth=cluster_unit.get_count_predicted_label_equal_to_ground_truth(label_name=label_name,
                                                                                                                                                  experiment_id=experiment_model_information.experiment_id,
                                                                                                                                                  label_template_id=label_template.id),
                                                            
                                                            reasons=cluster_unit.get_per_label_runs_one_experiment(experiment_id=experiment_model_information.experiment_id,
                                                                                                                   label_name=label_name),
                                                            per_label_labels=cluster_unit.get_per_label_dict_single_experiment(experiment_id=experiment_model_information.experiment_id,
                                                                                                                               label_name=label_name,
                                                                                                                               per_label_detail_label_names=self.per_label_names))
                                                                                                                          
                    one_label_experiment_data.results.append(label_result)
                experiment_predicted_data.label_name_predicted_data.append(one_label_experiment_data)
            self.experiment_unit_data.append(experiment_predicted_data)

    @classmethod
    def create_from_cluster_units_label_template_id(cls, cluster_unit_entities: List[ClusterUnitEntity], label_template: LabelTemplateEntity) -> "GetSampleUnitsLabelingFormatResponse":
        """creates the whole return object with the data it needs, to be built correctly"""
        sample_units_return_format_labeling = cls()

        sample_units_return_format_labeling.insert_model_information(cluster_unit_entities=cluster_unit_entities, label_template=label_template)
        sample_units_return_format_labeling.insert_cluster_unit_experiment_data(cluster_unit_entities=cluster_unit_entities, label_template=label_template)
        return sample_units_return_format_labeling

