
from typing import Dict, List
from flask_pymongo.wrappers import Database
from pymongo import UpdateOne

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import PredictionCategoryTokens, ClusterUnitCategoryFieldNames, ClusterUnitEntity, ClusterUnitEntityCategory, ClusterUnitEntityPredictedCategory
from app.utils.logging_config import get_logger


logger = get_logger(__name__)


class ClusterUnitRepository(BaseRepository[ClusterUnitEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ClusterUnitEntity, "cluster_unit")
        self.collection.create_index({"cluster_entity_id": 1}) # To speed up the lookup for to find all the cluster units

    def update_ground_truth_category(self, cluster_unit_entity_id: PyObjectId, ground_truth_category: ClusterUnitCategoryFieldNames, ground_truth: bool):
        filter = {"_id": cluster_unit_entity_id}
        update_path = f"ground_truth.{ground_truth_category}"
        # Update only the nested value
        update = {"$set": {update_path: ground_truth}}  # or keyword_search_subreddit.value if just one value

        return self.collection.update_one(filter, update)
    
    def insert_predicted_category(self, cluster_unit_entity_id: PyObjectId, experiment_id: PyObjectId, cluster_unit_predicted_categories: ClusterUnitEntityPredictedCategory):
        filter = {"_id": cluster_unit_entity_id}

        # First, check if the field is null and initialize it as an empty dictionary if needed
        # This handles the case where predicted_category exists but is null
        self.collection.update_one(
            {"_id": cluster_unit_entity_id, "predicted_category": None},
            {"$set": {"predicted_category": {}}}
        )

        # Now set the prediction for this specific experiment_id as a dictionary key
        # This uses dot notation to set a specific key in the dictionary
        update = {
            "$set": {
                f"predicted_category.{str(experiment_id)}": cluster_unit_predicted_categories.model_dump(by_alias=True)
            }
        }

        return self.collection.update_one(filter, update)
    

    def insert_many_predicted_categories(
        self,
        experiment_id: PyObjectId,
        predictions_map: Dict[PyObjectId, ClusterUnitEntityPredictedCategory]
    ):
        """
        Insert many predicted categories
        """
      
        
        # Use a single bulk write with upsert to handle both init and update
        bulk_ops = [
            UpdateOne(
                {"_id": cluster_unit_id},
                [  # Using pipeline update for conditional logic
                    {
                        "$set": {
                            "predicted_category": {
                                "$mergeObjects": [
                                    {"$ifNull": ["$predicted_category", {}]},
                                    {str(experiment_id): predictions.model_dump(by_alias=True)}
                                ]
                            }
                        }
                    }
                ],
                upsert=False
            )
            for cluster_unit_id, predictions in predictions_map.items()
        ]
        
        # Single database call for everything!
        inserted_count = self.collection.bulk_write(bulk_ops, ordered=False).inserted_count
        logger.info(f"inserted a total of {inserted_count} predictions. During {experiment_id} experiment")
        return 

