

from typing import List
from pydantic import BaseModel


class CreateScraperRequest(BaseModel):
    keywords: List[str]
    subreddits: List[str]