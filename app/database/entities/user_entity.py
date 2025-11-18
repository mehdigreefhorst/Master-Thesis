

from enum import Enum
from typing import Optional
from app.database.entities.base_entity import BaseEntity

class UserRole(str, Enum):
    Default = 'DEFAULT'
    Admin = 'ADMIN'

class UserEntity(BaseEntity):
    email: str
    password: bytes
    reddit_name: Optional[str] = None
    reddit_api_key: Optional[str] = None
    reddit_password: Optional[str] = None
    reddit_client_id: Optional[str] = None
    open_router_api_key: Optional[str] = None
    role: UserRole = UserRole.Default
    