

from typing import List
from pydantic import BaseModel
from datetime import datetime

from app.database.entities.experiment_entity import PrevalenceDict

"""
labelName: 'problem_description',
        prevalence: 93,
        prevalenceCount: 487,
        totalSamples: 523,
        accuracy: 96,
        certaintyDistribution: { certain: 450, uncertain: 37, split: 0 },
        confusionMatrix: { tp: 467, fp: 20, fn: 19, tn: 17 }
"""

class ConfusionMatrix(BaseModel):
    tp: int
    fp: int
    fn: int
    tn: int


class PredictionMetric(BaseModel):
    prediction_categor_name: str
    prevalence: float
    prevalenceCount: int # how often it is seen
    totalSamples: int # total samples in sample
    accuracy: float # accuracy metric prevelance relating to ground truth. Is dependend on threshold correct
    certaintyDistribution: PrevalenceDict
    confusionMatrix: ConfusionMatrix
    


class GetExperimentsResponse(BaseModel):
    id: str
    name: str
    model: str
    created: datetime
    total_samples: int
    overall_accuracy: float
    overall_consistency: float
    prediction_metric: List[PredictionMetric]