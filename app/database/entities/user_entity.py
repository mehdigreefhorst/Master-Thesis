

from app.database.entities.base_entity import BaseEntity


class UserEntity(BaseEntity):
    reddit_name: str
    reddit_api_key: str
    reddit_password: str
    reddit_client_id: str
    