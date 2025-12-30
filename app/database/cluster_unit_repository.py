
from typing import Any, Dict, List, Mapping, Optional
from flask_pymongo.wrappers import Database
from pymongo import UpdateOne

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import ClusterUnitEntity, ClusterUnitEntityPredictedCategory
from app.utils import utc_timestamp
from app.utils.logging_config import get_logger


logger = get_logger(__name__)


class ClusterUnitRepository(BaseRepository[ClusterUnitEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ClusterUnitEntity, "cluster_unit")
        self.collection.create_index({"cluster_entity_id": 1}) # To speed up the lookup for to find all the cluster units

    def _convert_to_entity(self, obj: Mapping[str, Any]) -> ClusterUnitEntity:
        """Override to ensure None values in ground_truth nested fields are preserved during deserialization"""
        # Use model_validate with context to preserve None values
        return ClusterUnitEntity.model_validate(obj, strict=False, context={"preserve_none": True})

    def update_ground_truth_category(self, cluster_unit_entity_id: PyObjectId, label_template_id: PyObjectId, ground_truth_category: str, ground_truth: bool, per_label_name: Optional[str]= None, per_label_value: Optional[Any] = None):
        filter = {"_id": cluster_unit_entity_id}

        # First, get the current document to find all None values
        doc = self.collection.find_one(filter, {f"ground_truth.{label_template_id}.values": 1})

        if not doc or "ground_truth" not in doc or str(label_template_id) not in doc["ground_truth"]:
            # If the structure doesn't exist, just do a simple update
            update_path = f"ground_truth.{label_template_id}.values.{ground_truth_category}.value"
            return self.collection.update_one(filter, {"$set": {update_path: ground_truth}})

        # Build update operations: set the target value and convert all None values to False
        update_ops = {}
        values = doc["ground_truth"][str(label_template_id)].get("values", {})

        # Set the target category to the provided value
        target_path = f"ground_truth.{label_template_id}.values.{ground_truth_category}.value"
        update_ops[target_path] = ground_truth

        # Convert all None values to False (excluding the target category we're updating)
        for category, category_data in values.items():
            if category != ground_truth_category and isinstance(category_data, dict):
                if category_data.get("value") is None:
                    none_path = f"ground_truth.{label_template_id}.values.{category}.value"
                    update_ops[none_path] = False

        # Perform single atomic update with all changes
        return self.collection.update_one(filter, {"$set": update_ops})
    
    def update_ground_truth_category_per_label(self, cluster_unit_entity_id: PyObjectId, label_template_id: PyObjectId, ground_truth_category: str, per_label_name: str, per_label_value: Any):
        filter = {"_id": cluster_unit_entity_id}
        
        update_path = f"ground_truth.{label_template_id}.values.{ground_truth_category}.{per_label_name}"
        return self.collection.update_one(filter, {"$set": {update_path: per_label_value}})
        
    
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
    

    def delete_predicted_category(self, cluster_unit_entity_ids: List[PyObjectId], experiment_id: PyObjectId):
        filter = {"_id": {"$in": cluster_unit_entity_ids}}
        
        # check if the predicted category even 
        deleted_result =  self.collection.update_many(
            filter,
            {"$unset": { f"predicted_category.{experiment_id}": ""}}
        )
        return deleted_result.modified_count

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
    
    def set_none_ground_truths_to_false(self, cluster_unit_ids: List[PyObjectId], label_template_id: PyObjectId, labels_default_values: Dict[str, bool | str | int]):
        """
        Set all ground truth values that are None to False for multiple cluster units.

        Args:
            cluster_unit_ids: List of cluster unit IDs to update
            label_template_id: The label template ID to update ground truths for

        Returns:
            Number of cluster units updated
        """
        if not cluster_unit_ids:
            logger.warning("No cluster unit IDs provided to set_none_ground_truths_to_false")
            return 0

        logger.info(
            f"Setting None ground truths to False for {len(cluster_unit_ids)} cluster units "
            f"with label_template_id={label_template_id}"
        )

        updated_count = 0

        # Process each cluster unit
        for cluster_unit_id in cluster_unit_ids:
            # Get the current document to find None values
            doc = self.collection.find_one(
                {"_id": cluster_unit_id},
                {f"ground_truth.{label_template_id}.values": 1}
            )

            if not doc or "ground_truth" not in doc or str(label_template_id) not in doc["ground_truth"]:
                # No ground truth exists for this label template, skip
                continue

            # Find all None values and build update operations
            update_ops = {}
            values = doc["ground_truth"][str(label_template_id)].get("values", {})

            for category, category_data in values.items():
                if isinstance(category_data, dict) and category_data.get("value") is None:
                    update_path = f"ground_truth.{label_template_id}.values.{category}.value"
                    update_ops[update_path] = labels_default_values.get(category)

            # If there are updates to make, execute them
            if update_ops:
                self.collection.update_one(
                    {"_id": cluster_unit_id},
                    {"$set": update_ops}
                )
                updated_count += 1

        logger.info(f"Updated {updated_count} cluster units (set None ground truths to False)")
        return updated_count

    def delete_many_by_cluster_enity_id(self, cluster_entity_id: PyObjectId):
        """Delete all cluster units associated with a specific cluster entity"""

        # Convert to ObjectId if it's a string
        # First, check how many exist
        count_before = self.collection.count_documents({"cluster_entity_id": cluster_entity_id})
        logger.info(f"[delete_many_by_cluster_enity_id] Found {count_before} cluster units for cluster_entity_id={cluster_entity_id}")

        filter = {"cluster_entity_id": cluster_entity_id}
        result = self.collection.delete_many(filter)
        logger.info(f"[delete_many_by_cluster_enity_id] Deleted {result.deleted_count} cluster units for cluster_entity_id={cluster_entity_id}")
        return result

    def update_many_cluster_units(self, cluster_units: List[ClusterUnitEntity]):
        """
        Update multiple cluster unit entities in a single bulk operation.

        Args:
            cluster_units: List of ClusterUnitEntity objects to update

        Returns:
            Number of documents modified
        """
        if not cluster_units:
            logger.warning("No cluster units provided to update_many_cluster_units")
            return 0

        # Build bulk update operations
        bulk_ops = []
        current_time = utc_timestamp()

        for unit in cluster_units:
            # Get entity data and remove _id
            update_data = {k: v for k, v in unit.dump_for_database().items() if k != "_id"}
            # Add updated_at timestamp
            update_data["updated_at"] = current_time

            bulk_ops.append(
                UpdateOne(
                    {"_id": unit.id},
                    {"$set": update_data}
                )
            )

        # Execute bulk write
        result = self.collection.bulk_write(bulk_ops, ordered=False)
        logger.info(f"Updated {result.modified_count} cluster units in bulk operation")
        return result.modified_count
