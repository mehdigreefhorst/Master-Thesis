
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import ClusterUnitCategoryFieldNames, ClusterUnitEntity, ClusterUnitEntityCategory

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


