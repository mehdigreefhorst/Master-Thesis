
from typing import List
from pydantic import BaseModel

from responses.reddit_post_comments_response import RedditComment, RedditPost

class RedditBaseEntity(BaseModel):
    text: str
    author: str
    upvotes: int
    downvotes: int
    user_tag: str | None # user added tag for example "deaf"
    created_utc: float # created at UTC timestamp


class RedditCommentEntity(RedditBaseEntity):
    replies: List["RedditCommentEntity"]
    controversiality: float
    depth: int # How many nests are above this comment

    @classmethod
    def from_comment_response(cls, comment: RedditComment) -> "RedditCommentEntity":
        cls(
            text= comment.selftext,
            author=comment.author,
            upvotes= comment.ups,
            downvotes=comment.downs,
            user_tag=comment.link_flair_text,
            created_utc=comment.created_utc,
            controversiality=comment.controversiality,
            depth=comment.depth,
            replies=[RedditCommentEntity.from_comment_response(reply.get_comments()) for reply in comment.replies if isinstance(reply, RedditComment)]
        )

class RedditPostEntity (RedditBaseEntity):
    sub_reddit: str # subreddit where the post was made in
    send_replies: bool # shows whether the author has send replies to the comments received

    permalink: str # e.g. '/r/deaf/comments/1mg82a6/is_there_a_polite_way_to_decline_signing/'   | this is used to retrieve the comments
    comments: List[RedditCommentEntity]

    @classmethod
    def from_post_response(cls, post: RedditPost, comments: List[RedditCommentEntity]):
        return cls(
            text= post.selftext,
            author=post.author,
            upvotes= post.ups,
            downvotes=post.downs,
            user_tag=post.link_flair_text,
            created_utc=post.created_utc,
            subreddit=post.subreddit,
            send_replies=post.send_replies,
            comments=comments
            )



class RedditPostManager:
    """in this class we simplify the posts and comments into a more undertandable data structure
    that relates the posts and comments to its parent without the data and children attribute. This class also manages which query was executed to find the post 
    also it makes it easy restrict which posts and comments have already been scraped so that double execution is inhibited"""

    @staticmethod
    def create_reddit_post_conversation(post: RedditPost, comments: List[RedditComment]):
        """Transforms the response format of the reddit posts, into the structure that we would like to save in the database
        It is important to start with the comments first, because each of the comments have a thread and it might be very nested
        """
        comment_entities = [RedditCommentEntity.from_comment_response(comment) for comment in comments]
        post_entity = RedditPostEntity.from_post_response(post, comment_entities)
        # now call the database to update with the post with its comments

        # now enrich the object with LLM to make a comment more full of information. 

    
