

from typing import Dict, List
from pydantic import BaseModel


class GetKeywordSearches(BaseModel):
    keyword_search_post_ids: Dict[str, List] # e.g. key = "problems around videos", value = ["post_id1", "post_id2", "post_id3", ...]
