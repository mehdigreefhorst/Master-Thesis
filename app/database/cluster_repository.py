
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.cluster_entity import ClusterEntity

class ClusterRepository(BaseRepository[ClusterEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ClusterEntity, "cluster")

