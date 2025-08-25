

from enum import Enum
from app.database.entities.base_entity import BaseEntity

class UserRole(str, Enum):
    Default = 'DEFAULT'
    Admin = 'ADMIN'

class UserEntity(BaseEntity):
    reddit_name: str
    reddit_api_key: str
    reddit_password: str
    reddit_client_id: str
    role: UserRole = UserRole.Admin
    