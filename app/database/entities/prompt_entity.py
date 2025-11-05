

from app.database.entities.base_entity import BaseEntity, PyObjectId


class PromptEntity(BaseEntity):
    user_id: PyObjectId
    prompt: str
    category: str
