


from enum import Enum
from typing import Dict, List, Literal, Optional
from app.database.entities.base_entity import BaseEntity, PyObjectId


class ClusterStatusType(str, Enum):
    Initialized = "initialized"
    Ongoing = "ongoing"
    Paused = "paused"
    Completed = "completed"
    Error = "error"

class ClusterTextThreadModeType(str, Enum):
    PlainText = "plain_text"
    AppendedText = "appended_text"
    LlmParsedText = "llm_parsed_text"

class ClusterPostPrepStatusType(str, Enum):
    """explains the preparation from post to cluster units"""
    Created = "created" # not started
    Ongoing = "ongoing" # ongoing the prep
    Completed = "completed" # finished the prep


class ClusterEntity(BaseEntity):
    scraper_entity_id: PyObjectId
    text_thread_mode: ClusterStatusType # Literal["plain_text", "appended_text", "llm_parsed_text"]
    prompt: Optional[str] = None
    status: ClusterStatusType #Literal["initialized", "ongoing", "paused", "completed", "error"]
    post_entity_ids_prep_status: Dict[PyObjectId, ClusterPostPrepStatusType]

    @classmethod
    def from_params(cls, scraper_entity_id: PyObjectId, text_thread_mode: ClusterTextThreadModeType, post_entity_ids: List[PyObjectId], prompt: str = None) -> "ClusterEntity":
        post_entity_ids_prep_status = {post_entity_id: ClusterPostPrepStatusType.Created for post_entity_id in post_entity_ids}
        return cls(
            scraper_entity_id=scraper_entity_id,
            text_thread_mode=text_thread_mode,
            prompt=prompt,
            status=ClusterStatusType.Initialized,
            post_entity_ids_prep_status= post_entity_ids_prep_status
            
        )