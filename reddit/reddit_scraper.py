from __future__ import annotations # needed so that we can use the nested structure of replies
import os
import requests
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

class BaseRedditMessage(BaseModel):
    id: str # Id of the reddit post, this is in a string format
    selftext: str # text in a reddit post
    subreddit: str # reddit where it was found
    ups: int # number of upvotes more than downvotes
    downs: int # number of downvotes more than upvotes
    send_replies: bool
    selftext_html: Optional[str] # we can use this to figure out whether a picture of link is added, as you won't see this in the selftext if embedded on reddit
    permalink: str # e.g. '/r/deaf/comments/1mg82a6/is_there_a_polite_way_to_decline_signing/'   | this is used to retrieve the comments
    link_flair_text: Optional[str] # user added tag for example "deaf"
    author: str # The author name 
    created_utc: float # created at UTC timestamp


class RedditPost(BaseRedditMessage):

    title: str # reddit post title
    upvote_ratio: float # percentage of upvote vs downvotes
    


class RedditComment(BaseRedditMessage):
    body: str
    replies: Union[RedditResponse, str] = ""
    controversiality: float
    depth: int # How many nests are above this comment
    media_metadata: Dict[str, Any]

class RedditChild(BaseModel):
    """Represents a child item in the Reddit API response"""
    kind: str
    data: RedditPost | RedditComment

class RedditDataResponse(BaseModel):
    after: str
    dist: int
    modhash: Optional[Any]
    before: Optional[Any]
    children: List[RedditChild]

class RedditResponse(BaseModel):
    kind: str
    data: RedditDataResponse

    def get_posts(self):
        return [post.data for post in self.data.children]

# Update forward references after all models are defined
RedditChild.model_rebuild()
RedditComment.model_rebuild()
RedditResponse.model_rebuild()

class RedditPostManager:
    """in this class we simplify the posts and comments into a more undertandable data structure
    that relates the posts and comments to its parent without the data and children attribute. This class also manages which query was executed to find the post 
    also it makes it easy restrict which posts and comments have already been scraped so that double execution is inhibited"""

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

    
    def search(self, subreddit: str, query: str, age: str, limit= 25, filter: Optional[str] = ""):
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
    
    def search_comments(self, permalink: str):
        response = requests.get(f"https://oauth.reddit.com/{permalink}", headers=self.headers, params={'limit': 100})
        full_submission_post =  response.json()[0] # this is the post of the permalink that is connected to it
        comments = response.json()[1]
        print(comments.keys())
        return RedditResponse.model_validate(comments).get_posts()
        

    def get_post_comments(self, reddit_post: RedditPost):
        comments = self.search_comments(reddit_post.permalink)
        return comments



redditScaper= RedditScraper()
posts = redditScaper.search("deaf", "video", "week")
print(redditScaper.get_post_comments(posts[0]))
