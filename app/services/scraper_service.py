

from typing import List
from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId
from app.database.entities.scraper_entity import KeyWordSearchObjective, ScraperEntity, KeyWordSearchSubreddit, KeyWordSearch
from app.database import get_post_repository
from app.requests.scraper_requests import CreateScraperRequest
from app.responses.reddit_post_comments_response import RedditPost
from app.services.reddit_scraper_service import RedditManager



class ScraperService(BaseModel):
    """handles the scraper related functions and database modeling of the scraper collection"""

    @staticmethod
    def create_scraper_instance(scraper_request: CreateScraperRequest, user_id: PyObjectId):
        """creates an instance of the scraper in our database"""
        keyword_search_list = [KeyWordSearch(keyword=keyword_search) for keyword_search in scraper_request.keywords]
        subreddit_keyword_search = {subreddit: KeyWordSearchSubreddit(subreddit=subreddit, keyword_searches=keyword_search_list) for subreddit in scraper_request.subreddits}
        keyword_search_objective = KeyWordSearchObjective(keyword_subreddit_searches=subreddit_keyword_search)
        scraper_entity = ScraperEntity(
            keywords = scraper_request.keywords,
            subreddits= scraper_request.subreddits,
            post_ids=[],
            keyword_search_objective=keyword_search_objective,
            user_id=user_id
        )
        return scraper_entity
    
    @staticmethod
    def get_posts_from_ids(reddit_posts: List[RedditPost], user_id: PyObjectId):
        post_ids = [post.id for post in reddit_posts]
        post_entity_ids, reddit_post_ids = get_post_repository().find_all_from_reddit_post_ids(post_ids, user_id)
        return post_entity_ids, reddit_post_ids

    
    @staticmethod
    def execute_subreddit_search_instance(scraper_instance: ScraperEntity, posts_per_keyword: int = 30):
        """finds the next keyword to search for in a specific subreddit, 
        then it searches for the posts that relate to the keyword through reddit api
        then it checks whether some of the posts have been retrieved before
        if so, it adds the post_entity ids to the scraper entity 
        for the new ones, it retrieves the posts and its comments, updates the post collection & scraper instance collection

        """
        reddit_scraper_manager = RedditManager(posts_per_keyword)
        if scraper_instance.status != "ongoing":
            return 
        
        next_subreddit, next_keyword = scraper_instance.get_next_keyword()
        found_reddit_posts = reddit_scraper_manager.find_related_posts_to_keyword(
            subreddit=next_subreddit,
            keyword=next_keyword,
            age="all",
            filter="top")
        
        post_entity_ids, reddit_post_ids = ScraperService.get_posts_from_ids(found_reddit_posts, scraper_instance.user_id)
        # scraper_instance.keyword_search_objective[next_subreddit]
        next_keyword.found_post_ids.extend(post_entity_ids)

        for reddit_post in found_reddit_posts:
            if reddit_post.id in reddit_post_ids:
                continue
            reddit_comments = reddit_scraper_manager.scrape_comments_of_post(reddit_post)
            post_entity = 

        





