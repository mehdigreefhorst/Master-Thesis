


from typing import Literal
from app.database.entities.base_entity import BaseEntity, PyObjectId


class ClusterInstanceEntity(BaseEntity):
    scraper_entity_id: PyObjectId
    text_thread_mode: Literal["plain_text","appended_text", "llm_parsed_text"]
    status: Literal["initialized", "ongoing", "paused", "completed", "error"]
    