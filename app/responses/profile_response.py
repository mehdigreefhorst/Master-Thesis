

from typing import Optional
from pydantic import BaseModel


class ProfileResponse(BaseModel):
    email: Optional[str] = None
    reddit_name: Optional[str] = None
    reddit_api_key: Optional[str] = None
    reddit_password: Optional[str] = None
    reddit_client_id: Optional[str] = None
    open_router_api_key: Optional[str] = None