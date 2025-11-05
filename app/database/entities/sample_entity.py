

from typing import List
from app.database.entities.base_entity import BaseEntity, PyObjectId


class SampleEntity(BaseEntity):
    user_id: PyObjectId
    picked_posts: PyObjectId
    cluster_unit_entities: List[PyObjectId]


