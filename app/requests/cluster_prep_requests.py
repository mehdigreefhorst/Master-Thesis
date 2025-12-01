from typing import Literal, Optional
from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import ClusterUnitCategoryFieldNames, ClusterUnitEntityCategory
from app.utils.types import MediaStrategySkipType


class ScraperClusterId(BaseModel):
    scraper_cluster_id: PyObjectId

class PrepareClusterRequest(BaseModel):
    scraper_cluster_id: PyObjectId
    media_strategy_skip_type: MediaStrategySkipType = MediaStrategySkipType.Ignore


class GetClusterUnitsRequest(BaseModel):
    scraper_cluster_id: PyObjectId
    reddit_message_type: Literal["post", "comment", "all"] = "all"


class UpdateGroundTruthRequest(BaseModel):
    cluster_entity_id: PyObjectId
    ground_truth_category: ClusterUnitCategoryFieldNames
    ground_truth: bool