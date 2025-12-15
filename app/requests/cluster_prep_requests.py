from typing import Any, Dict, Literal, Optional
from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId
from app.database.entities.label_template import ProjectionLabelField, labelName
from app.utils.types import MediaStrategySkipType


class ScraperClusterId(BaseModel):
    scraper_cluster_id: PyObjectId

class PrepareClusterRequest(BaseModel):
    scraper_cluster_id: PyObjectId
    media_strategy_skip_type: MediaStrategySkipType


class GetClusterUnitsRequest(BaseModel):
    scraper_cluster_id: PyObjectId
    reddit_message_type: Literal["post", "comment", "all"] = "all"
    cluster_entity_id: Optional[PyObjectId] = None


class UpdateGroundTruthRequest(BaseModel):
    label_template_id: PyObjectId
    cluster_unit_entity_id: PyObjectId
    ground_truth_category: str
    ground_truth: bool


class UpdateGroundTruthPerLabelRequest(BaseModel):
    label_template_id: PyObjectId
    cluster_unit_entity_id: PyObjectId
    ground_truth_one_shot_example: Dict[labelName, ProjectionLabelField]



class UpdateOneShotExampleRequest(BaseModel):
    label_template_id: PyObjectId
    ground_truth_one_shot_example: Dict[labelName, ProjectionLabelField]
