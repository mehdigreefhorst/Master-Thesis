from __future__ import annotations # needed so that we can use the nested structure of replies
import os
import requests
from typing import List, Optional
from dotenv import load_dotenv

from responses.reddit_post_comments_response import RedditComment, RedditPost, RedditResponse

load_dotenv()



class RedditScraper:
    """The system that calls the reddit API with the correct information"""
    def __init__(self):
        REDDIT_SECRET_KEY = os.getenv("REDDIT_SECRET_KEY")
        CLIENT_ID = os.getenv("CLIENT_ID")
        
        self.auth = requests.auth.HTTPBasicAuth(CLIENT_ID,REDDIT_SECRET_KEY)
        self.headers = self.get_requests_headers_bearer()
    
    def get_requests_headers_bearer(self):
        login_data = {
            'grant_type' : 'password',
            'username' : os.getenv("REDDIT_USERNAME"),
            'password' : os.getenv("REDDIT_PASSWORD")
        }
        headers = {'User-Agent': 'DeafHHApp/0.0.1'}
        REDDIT_SECRET_KEY = os.getenv("REDDIT_SECRET_KEY")
        CLIENT_ID = os.getenv("CLIENT_ID")
        auth = requests.auth.HTTPBasicAuth(CLIENT_ID,REDDIT_SECRET_KEY)
        response = requests.post('https://www.reddit.com/api/v1/access_token',auth=auth,data=login_data, headers=headers)
        
        print("response = \n", response.json())
        token = response.json()['access_token']
        headers = {**headers, **{'Authorization': f'bearer {token}'}}
        return headers

    
    def search(self, subreddit: str, query: str, age: str, limit= 25, filter: Optional[str] = "top") -> RedditPost:
        """
        subreddit = "deaf"; // subreddit name goes here
        query = what should be added in the reddit search bar
        filter = "top"; // filter options are(new, hot, top, rising)
        top = highest upvotes

        Hot = highest upvotes/time
        age = "all"; // options are(hour, day, week, month, year, all)
        """
        query = query.replace(" ", "+")
        response = requests.get(f"https://oauth.reddit.com/r/{subreddit}/{filter}?search={query}/?t=${age}", headers=self.headers, params={'limit': limit})
        return RedditResponse.model_validate(response.json()).get_posts()
    
    def search_comments(self, permalink: str) -> List[RedditComment]:
        response = requests.get(f"https://oauth.reddit.com/{permalink}", headers=self.headers, params={'limit': 100})
        full_submission_post =  response.json()[0] # this is the post of the permalink that is connected to it, it is exactly the same as the post
        comments = response.json()[1]
        print(comments.keys())
        return RedditResponse.model_validate(comments).get_comments()
        

    def get_post_comments(self, reddit_post: RedditPost) -> List[RedditComment]:
        comments = self.search_comments(reddit_post.permalink)
        return comments


class RedditManager:
    """This class manages to send all of the searches that need to be searched in the subreddit. It also makes sure to limit the number of responses send
    
    :params 
        subreddit: to search in
        keywords: list of keywords to search for in subreddit
        number_posts_per_keyword: total number of posts to extract per keyword [TODO should this be dynamically set?]"""
    def __init__(self, subreddit: str, keywords: List[str], number_posts_per_keyword: int):
        self.subreddit = subreddit
        self.keyswords = keywords
        self.scraper = RedditScraper()
        self.number_posts_per_keyword = number_posts_per_keyword
    

    def scrape_subreddit(self):
        """scrapes the whole subreddit with each of the keywords and builds the reddit conversation Post entity"""
        
    def scrape_keyword(self, keyword: str):
        reddit_posts = self.scraper.search(subreddit=self.subreddit,
                                    query=keyword,
                                    age="all", # or past year only to only focus on unmet needs?
                                    limit=self.number_posts_per_keyword)
        for post in reddit_posts:
            comments = self.scraper.get_post_comments(post)




redditScaper= RedditScraper()
posts = redditScaper.search("deaf", "video", "week")
print(redditScaper.get_post_comments(posts[0]))
