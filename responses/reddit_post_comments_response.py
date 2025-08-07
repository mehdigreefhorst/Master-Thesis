from __future__ import annotations # needed so that we can use the nested structure of replies

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel
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

    def get_posts(self) -> RedditPost:
        return [post.data for post in self.data.children]
    
    def get_comments(self)-> RedditComment:
        return [post.data for post in self.data.children]


# Update forward references after all models are defined
RedditChild.model_rebuild()
RedditComment.model_rebuild()
RedditResponse.model_rebuild()