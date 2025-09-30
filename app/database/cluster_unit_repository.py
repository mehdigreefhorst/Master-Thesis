
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.cluster_unit_entity import ClusterUnitEntity

class ClusterUnitRepository(BaseRepository[ClusterUnitEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ClusterUnitEntity, "cluster_unit")

