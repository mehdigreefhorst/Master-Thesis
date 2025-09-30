

from typing import Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel
from app.database.entities.base_entity import BaseEntity, PyObjectId

class KeyWordSearch(BaseModel):
    """this class keeps track the search results for one of the keywords """
    keyword: str
    found_post_ids: List[PyObjectId] = list()
    status: Literal["pending", "ongoing", "done"] = "pending"


class KeyWordSearchSubreddit(BaseModel):
    subreddit: str
    keyword_searches: Dict[str, KeyWordSearch] # dict of keyword as str key and object as value
    status: Literal["pending", "ongoing", "done"] = "pending"

    def find_next_keyword(self):
        for keyword in self.keyword_searches.values():
            if keyword.status == "ongoing":
                return keyword
            elif keyword.status == "pending":
                keyword.status = "ongoing"
                return keyword


class KeyWordSearchObjective(BaseModel):
    """keeps track the search results for each of the keywords"""
    keyword_subreddit_searches: Dict[str, KeyWordSearchSubreddit] # dict of subreddit in str with the object

    def find_next_pending_keyword_ongoing_subreddit(self) -> Tuple[KeyWordSearchSubreddit, KeyWordSearch]:
        """first checks whether a subreddit is ongoing, if it is it continues from that subreddit, if not, it checks for a remaining ongoing subreddit"""
        ongoing_subreddits = [subreddit for subreddit in self.keyword_subreddit_searches.values() if subreddit.status == "ongoing"]
        if ongoing_subreddits:
            next_subreddit = ongoing_subreddits[0]
            next_keyword = next_subreddit.find_next_keyword()
            if not next_keyword:
                next_subreddit.status = "done"
            else:
                return next_subreddit, next_keyword
        
        pending_subreddits = [subreddit for subreddit in self.keyword_subreddit_searches.values() if subreddit.status == "pending"]
        if pending_subreddits:
            next_subreddit = pending_subreddits[0]
            next_subreddit.status = "ongoing"
            next_keyword = next_subreddit.find_next_keyword()

            return next_subreddit, next_keyword
        
    def check_unscraped_keywords(self) -> bool:        
        unscraped_subreddits = [subreddit for subreddit in self.keyword_subreddit_searches.values() if subreddit.status == "pending" or subreddit.status == "ongoing"]
        if unscraped_subreddits:
            return True
        





class ScraperEntity(BaseEntity):
    user_id: PyObjectId
    keywords: List[str]
    subreddits: List[str] # Subreddits to search for
    keyword_search_objective: KeyWordSearchObjective
    status: Literal["initialized", "ongoing", "paused", "completed", "error"] = "initialized"
    age: Literal["hour", "day", "week", "month", "year", "all"] = "all"
    filter: Literal["new", "hot", "top", "rising"] = "top"
    posts_per_keyword: int = 30

    def get_next_keyword(self) -> Tuple[KeyWordSearchSubreddit, KeyWordSearch]:
        return self.keyword_search_objective.find_next_pending_keyword_ongoing_subreddit()
    
    def has_unscraped_keywords(self) -> bool:
        return self.keyword_search_objective.check_unscraped_keywords()
    
    def get_all_post_entity_ids(self) -> List[PyObjectId]:
        """gets the scraperEntity all the post_ids that were scraped by this entity"""
        post_entity_ids = []

        for sureddit, keyword_search_subreddit in self.keyword_search_objective.keyword_subreddit_searches.items():
            for keyword, keyword_search in keyword_search_subreddit.keyword_searches.items():
                post_entity_ids.extend(keyword_search.found_post_ids)
        
        return post_entity_ids


    

