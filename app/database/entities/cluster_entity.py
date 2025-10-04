


from enum import Enum
from typing import Dict, List, Literal, Optional
from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.utils.types import StatusType


class ClusterTextThreadModeType(str, Enum):
    PlainText = "plain_text"
    AppendedText = "appended_text"
    LlmParsedText = "llm_parsed_text"


class ClusterEntity(BaseEntity):
    scraper_entity_id: PyObjectId
    text_thread_mode: ClusterTextThreadModeType # Literal["plain_text", "appended_text", "llm_parsed_text"]
    prompt: Optional[str] = None
    status: StatusType #Literal["initialized", "ongoing", "paused", "completed", "error"]
    post_entity_ids_prep_status: Dict[PyObjectId, StatusType]

    @classmethod
    def from_params(cls, scraper_entity_id: PyObjectId, text_thread_mode: ClusterTextThreadModeType, post_entity_ids: List[PyObjectId], prompt: str = None) -> "ClusterEntity":
        post_entity_ids_prep_status = {post_entity_id: StatusType.Initialized for post_entity_id in post_entity_ids}
        return cls(
            scraper_entity_id=scraper_entity_id,
            text_thread_mode=text_thread_mode,
            prompt=prompt,
            status=StatusType.Initialized,
            post_entity_ids_prep_status= post_entity_ids_prep_status
            
        )