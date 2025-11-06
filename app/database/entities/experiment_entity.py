

from enum import Enum
from typing import Optional

from pydantic import BaseModel
from app.database.entities.base_entity import BaseEntity, PyObjectId


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
    aggregate_result: Optional[AggregateResult]
