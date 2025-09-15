

from typing import List
from flask import jsonify
from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId
from app.database.entities.scraper_entity import KeyWordSearchObjective, ScraperEntity, KeyWordSearchSubreddit, KeyWordSearch
from app.database import get_post_repository, get_scraper_repository
from app.requests.scraper_requests import CreateScraperRequest
from app.responses.reddit_post_comments_response import RedditPost
from app.services.post_service import PostService
from app.utils.reddit_scraper_api import RedditAPIManager

class ScrapingMessage(BaseModel):
    message: str
    processed: int = 0
    total: int = 0
    paused: bool = False

class ScraperService(BaseModel):
    """handles the scraper related functions and database modeling of the scraper collection"""

    @staticmethod
    def create_scraper_instance(scraper_request: CreateScraperRequest, user_id: PyObjectId):
        """creates an instance of the scraper in our database"""
        keyword_search_dict = {keyword_search: KeyWordSearch(keyword=keyword_search) for keyword_search in scraper_request.keywords}
        subreddit_keyword_search = {subreddit: KeyWordSearchSubreddit(subreddit=subreddit, keyword_searches=keyword_search_dict) for subreddit in scraper_request.subreddits}
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
    def get_posts_from_ids(reddit_posts: List[RedditPost]):
        """we look whether the post has been scraped before in the past, regardless of user_id"""
        post_ids = [post.id for post in reddit_posts]
        post_entity_ids, reddit_post_ids = get_post_repository().find_existing_post_entities_from_reddit_post_ids(post_ids)
        return post_entity_ids, reddit_post_ids

    
    @staticmethod
    def execute_subreddit_search_instance(scraper_instance: ScraperEntity):
        """finds the next keyword to search for in a specific subreddit, 
        then it searches for the posts that relate to the keyword through reddit api
        then it checks whether some of the posts have been retrieved before
        if so, it adds the post_entity ids to the scraper entity 
        for the new ones, it retrieves the posts and its comments, updates the post collection & scraper instance collection

        """
        reddit_scraper_manager = RedditAPIManager(scraper_instance.posts_per_keyword)

        print(scraper_instance.status)
        if scraper_instance.status != "initialized" and scraper_instance.status != "ongoing":
            raise Exception("scraper instance does not have correct status")
        
        next_subreddit, next_keyword = scraper_instance.get_next_keyword()
        # update keyword search status
        get_scraper_repository().update_keyword_search_status(scraper_instance.id, next_subreddit.subreddit, next_keyword)
        # update subreddit search status
        get_scraper_repository().update_subreddit_status(scraper_instance.id, next_subreddit)

        found_reddit_posts = reddit_scraper_manager.find_related_posts_to_keyword(
            subreddit=next_subreddit.subreddit,
            keyword=next_keyword.keyword,
            age=scraper_instance.age,
            filter=scraper_instance.filter)
        
        post_entity_ids, reddit_post_ids = ScraperService.get_posts_from_ids(found_reddit_posts)
        # scraper_instance.keyword_search_objective[next_subreddit]
        next_keyword.found_post_ids.extend(post_entity_ids)
        if post_entity_ids:
            post_entity_ids_not_yet_added = [post_entity_id for post_entity_id in post_entity_ids if post_entity_id not in next_keyword.found_post_ids]
            get_scraper_repository().append_postid_to_subreddit_keyword_search(scraper_instance.id, next_subreddit.subreddit, next_keyword.keyword, post_entity_ids_not_yet_added)

        for i, reddit_post in enumerate(found_reddit_posts):
            print("processing reddit_id ", reddit_post.id)
            if i % 5 == 0:  # only check every 5 posts
                if ScraperService.check_whether_scraped_is_paused(scraper_instance.id):
                    return {"message": "scraper is paused"}
            if reddit_post.id in reddit_post_ids:
                continue
            reddit_comments = reddit_scraper_manager.scrape_comments_of_post(reddit_post)
            post_entity = PostService().create_reddit_post_entity(reddit_post, reddit_comments)
            PostService().insert_into_db(post_entity)
            next_keyword.found_post_ids.append(post_entity.id)
            get_scraper_repository().append_postid_to_subreddit_keyword_search(scraper_instance.id, next_subreddit.subreddit, next_keyword.keyword, post_entity.id)
        
        # we must update the status of the keyword 
        next_keyword.status = "done"
        get_scraper_repository().update_keyword_search_status(scraper_instance.id, next_subreddit.subreddit, next_keyword)

        # update the status subreddit when there are no keywords left
        if not next_subreddit.find_next_keyword():
            next_subreddit.status = "done"
            get_scraper_repository().update_subreddit_status(scraper_instance.id, next_subreddit)

    @staticmethod
    def check_whether_scraped_is_paused(scraper_instance_id: str) -> bool:
        scraper = get_scraper_repository().find_by_id(scraper_instance_id, fields=["status"])
        print("scraper = ", scraper)
        if scraper.get("status") == "paused":
            print("Scraper paused")
            
        return scraper.get("status") == "paused"

    @staticmethod
    def scrape_all_subreddits_keywords(scraper_instance: ScraperEntity) -> ScrapingMessage:
        """ calculates total possible searches (keywords * subreddits), then excutes the subreddit search each time"""
        total_keyword_searches = len(scraper_instance.subreddits) * len(scraper_instance.keywords)
        for index in range(total_keyword_searches):
            print("scrape word index = ",  index)
            if ScraperService.check_whether_scraped_is_paused(scraper_instance.id):
                return ScrapingMessage(message="scraper is paused", processed=index, total=total_keyword_searches, paused=True)
            if scraper_instance.has_unscraped_keywords():
                ScraperService.execute_subreddit_search_instance(scraper_instance)
        scraper_instance.status = "completed"
        get_scraper_repository().update(scraper_instance.id, {"status": scraper_instance.status})

        return ScrapingMessage(message="successfully scraped the scraper instance on reddit", processed=index+1, total=total_keyword_searches, paused=False)




        





