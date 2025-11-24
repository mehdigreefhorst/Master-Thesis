

from datetime import datetime
from typing import Dict, List, Literal

from app.database.entities.base_entity import BaseEntity


class OpenRouterDataEntity(BaseEntity):
    """we just want to log data from the official frontend api"""
    public_api_data: Dict[Literal["models", "analytics", "categories"], Dict | List] # The result of public api for the frontend openrouter
    dev_api_data: List # All the models as listed by openrouter get models route
    date_added: str = datetime.now().strftime("%d-%m-%Y")
    
    
    