

from typing import List, Literal
from app.database.entities.base_entity import BaseEntity, PyObjectId


class ClusterUnitEntity(BaseEntity):
    cluster_instance_entity_id: PyObjectId # ClusterInstanceEntity
    comment_post_id: PyObjectId # RedditBaseEntity
    type: Literal["post", "comment"]
    reddit_id: str # official "REDDIT" reddit id
    author: str
    usertag: str
    upvotes: int
    downvotes: int
    created_utc: int
    thread_path_text: List[str] # the full prior thread (post -> comment -> reply --> ...) up until the current comment
    enriched_comment_thread_text: str # what the LLM made from the thread path text & text
    text: str # the author's individual text contribution to reddit

    