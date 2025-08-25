from __future__ import annotations # needed so that we can use the nested structure of replies

from typing import Annotated, Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

class BaseRedditMessage(BaseModel):
    id: str # Id of the reddit post, this is in a string format
    subreddit: str # reddit where it was found
    ups: int # number of upvotes more than downvotes
    downs: int # number of downvotes more than upvotes
    send_replies: bool
    permalink: str # e.g. '/r/deaf/comments/1mg82a6/is_there_a_polite_way_to_decline_signing/'   | this is used to retrieve the comments
    author_flair_text: Optional[str] # user added tag for example deaf or HOH
    author: str # The author name 
    created_utc: float # created at UTC timestamp


class RedditPost(BaseRedditMessage):
    kind: Literal["t3"] = "t3"  # discriminator value
    title: str # reddit post title
    upvote_ratio: float # percentage of upvote vs downvotes
    selftext: str # text in a reddit post
    link_flair_text: Optional[str] # user added tag for example "VENT"
    selftext_html: Optional[str] # we can use this to figure out whether a picture of link is added, as you won't see this in the selftext if embedded on reddit


    model_config = {
        "extra": "allow"
    }
    


class RedditComment(BaseRedditMessage):
    kind: Literal["t1"] = "t1" # discriminator value
    body: str
    replies: Union["RedditResponse", str] = ""
    controversiality: float
    depth: int # How many nests are above this comment
    media_metadata: Optional[Dict[str, Any]]  = None

    model_config = {
        "extra": "allow"
    }



# Restore RedditChild as a discriminated union
class RedditPostChild(BaseModel):
    kind: Literal["t3"]
    data: RedditPost

class RedditCommentChild(BaseModel):
    kind: Literal["t1"]
    data: RedditComment

# ✅ RedditChild as a union of both variants, with outer-level discriminator
RedditChild = Annotated[
    Union[RedditPostChild, RedditCommentChild],
    Field(discriminator="kind")
]
class RedditDataResponse(BaseModel):
    after: Optional[str]
    dist: Optional[int]
    modhash: Optional[Any]
    before: Optional[Any]
    children: List[RedditChild]

class RedditResponse(BaseModel):
    kind: str
    data: RedditDataResponse

    def get_posts(self) -> List[RedditPost]:
        return [post.data for post in self.data.children]
    
    def get_comments(self)-> List[RedditComment]:
        return [comment.data for comment in self.data.children]


# Update forward references after all models are defined
RedditComment.model_rebuild()
RedditResponse.model_rebuild()