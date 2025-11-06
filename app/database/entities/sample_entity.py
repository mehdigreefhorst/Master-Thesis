

from typing import List
from app.database.entities.base_entity import BaseEntity, PyObjectId


class SampleEntity(BaseEntity):
    user_id: PyObjectId
    picked_post_cluster_unit_ids: List[PyObjectId] # The posts that the user has selected to be randomly sampled from
    sample_cluster_unit_ids: List[PyObjectId] # sample size of cluster units taken with cluster_unit equal to the above one
    sample_size: int # sample size of how many Cluster units to take


