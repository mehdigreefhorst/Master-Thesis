
from typing import List
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.scraper_entity import KeyWordSearch, KeyWordSearchSubreddit, ScraperEntity

class ScraperRepository(BaseRepository[ScraperEntity]):
    def __init__(self, database: Database):
        super().__init__(database, ScraperEntity, "scraper")

    def find_by_user_id(self, user_id: PyObjectId) -> List[ScraperEntity]:
        return super().find({"user_id": user_id})
    
    def find_by_id_and_user(self, user_id: PyObjectId, scraper_entity_id: PyObjectId) -> ScraperEntity | None:
        """Finds and returns individual entity by its id which is also part of the user_id, makes sure entity belong to the given user."""
        filter = {"user_id": user_id, "_id": scraper_entity_id}
        return super().find_one(filter)
    
    def append_postid_to_subreddit_keyword_search(self, scraper_id: PyObjectId, subreddit: str, keyword: str, post_id: PyObjectId | List[PyObjectId]):
        """adds the internal post id to the scraper search result"""
        filter = {"_id": scraper_id}
        update_path = f"keyword_search_objective.keyword_subreddit_searches.{subreddit}.keyword_searches.{keyword}.found_post_ids"
        return super().insert_list_element(filter, update_path, post_id)
    
    def update_keyword_search_status(self, scraper_id: PyObjectId, subreddit: str, keyword_search: KeyWordSearch):
        filter = {"_id": scraper_id}
        update_path = f"keyword_search_objective.keyword_subreddit_searches.{subreddit}.keyword_searches.{keyword_search.keyword}.status"
        # Update only the nested value
        update = {"$set": {update_path: keyword_search.status}}  # or keyword_search.value if just one value

        return self.collection.update_one(filter, update)
    
    def update_subreddit_status(self, scraper_id: PyObjectId, keyword_search_subreddit: KeyWordSearchSubreddit):
        """updates the status of the subreddit"""
        filter = {"_id": scraper_id}
        update_path = f"keyword_search_objective.keyword_subreddit_searches.{keyword_search_subreddit.subreddit}.status"
        # Update only the nested value
        update = {"$set": {update_path: keyword_search_subreddit.status}}  # or keyword_search_subreddit.value if just one value

        return self.collection.update_one(filter, update)



