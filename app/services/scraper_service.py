

from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId
from app.database.entities.scraper_entity import KeyWordSearchObjective, ScraperEntity, KeyWordSearchSubreddit, KeyWordSearch
from app.requests.scraper_requests import CreateScraperRequest



class ScraperService(BaseModel):

    @staticmethod
    def create_scraper_instance(scraper_request: CreateScraperRequest, user_id: PyObjectId):
        keyword_search_list = [KeyWordSearch(keyword=keyword_search) for keyword_search in scraper_request.keywords]
        subreddit_keyword_search = [KeyWordSearchSubreddit(subreddit=subreddit, keyword_searches=keyword_search_list) for subreddit in scraper_request.subreddits]
        keyword_search_objective = KeyWordSearchObjective(keyword_subreddit_searches=subreddit_keyword_search)
        scraper_entity = ScraperEntity(
            keywords = scraper_request.keywords,
            subreddits= scraper_request.subreddits,
            post_ids=[],
            keyword_search_objective=keyword_search_objective,
            user_id=user_id
        )
        return scraper_entity
