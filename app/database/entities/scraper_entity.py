

from typing import List, Literal

from pydantic import BaseModel
from app.database.entities.base_entity import BaseEntity

class KeyWordSearch(BaseModel):
    """this class keeps track the search results for one of the keywords """
    keyword: str
    status: Literal["pending", "ongoing", "done"] = "pending"


class KeyWordSearchSubreddit(BaseModel):
    subreddit: str
    keyword_searches: List[KeyWordSearch]
    status: Literal["pending", "ongoing", "done"] = "pending"

    def find_next_pending_keyword(self):
        for keyword in self.keyword_searches:
            if keyword.status == "pending":
                keyword.status = "ongoing"
                return keyword


class KeyWordSearchObjective(BaseModel):
    """keeps track the search results for each of the keywords"""
    keyword_subreddit_searches: List[KeyWordSearchSubreddit]

    def find_next_pending_keyword_ongoing_subreddit(self):
        ongoing_subreddits = [subreddit for subreddit in self.keyword_subreddit_searches if subreddit.status == "ongoing"]
        if ongoing_subreddits:
            next_subreddit = ongoing_subreddits[0]
            next_keyword = next_subreddit.find_next_pending_keyword()
            if not next_keyword:
                next_subreddit.status = "done"
            return next_subreddit
        
        pending_subreddits = [subreddit for subreddit in self.keyword_subreddit_searches if subreddit.status == "pending"]
        if pending_subreddits:
            next_subreddit = pending_subreddits[0]
            next_subreddit.status = "ongoing"
            next_keyword = next_subreddit.find_next_pending_keyword()

            return next_subreddit



class ScraperEntity(BaseEntity):
    keywords: List[str]
    post_ids: List[str] # should we refer the post ids here or in the entities of the post
    subreddits: List[str] # Subreddits to search for
    keyword_search_objective: KeyWordSearchObjective