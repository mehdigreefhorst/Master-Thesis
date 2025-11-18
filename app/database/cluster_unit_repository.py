
from typing import List
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import PredictionCategoryTokens, ClusterUnitCategoryFieldNames, ClusterUnitEntity, ClusterUnitEntityCategory, ClusterUnitEntityPredictedCategory

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

    def find_filtered(self, cluster_entity_id: PyObjectId, filter_dict: dict, sort_field: str, sort_direction: int, skip: int, limit: int) -> List[ClusterUnitEntity]:
        """
        Find cluster units with custom filters, sorting, and pagination

        Args:
            cluster_entity_id: The cluster entity ID to filter by
            filter_dict: MongoDB filter conditions (e.g., {"subreddit": {"$in": ["techsupport"]}})
            sort_field: Field to sort by (e.g., "created_utc", "upvotes")
            sort_direction: 1 for ascending, -1 for descending
            skip: Number of documents to skip (for pagination)
            limit: Maximum number of documents to return

        Returns:
            List of ClusterUnitEntity objects matching the filters
        """
        # Combine cluster_entity_id filter with custom filters
        query = {"cluster_entity_id": cluster_entity_id, **filter_dict}
        sort_order = [(sort_field, sort_direction)]

        cursor = self.collection.find(query).sort(sort_order).skip(skip).limit(limit)
        return [self.entity_class.model_validate(doc) for doc in cursor]

    def count_filtered(self, cluster_entity_id: PyObjectId, filter_dict: dict) -> int:
        """
        Count cluster units matching the filters

        Args:
            cluster_entity_id: The cluster entity ID to filter by
            filter_dict: MongoDB filter conditions

        Returns:
            Number of documents matching the filters
        """
        query = {"cluster_entity_id": cluster_entity_id, **filter_dict}
        return self.collection.count_documents(query)

