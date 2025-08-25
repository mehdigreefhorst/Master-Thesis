
import json
import os
from typing import List, Optional
from pydantic import BaseModel
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.database.entities.base_entity import BaseEntity
from app.responses.reddit_post_comments_response import RedditComment, RedditPost, RedditResponse

class RedditBaseEntity(BaseEntity):
    reddit_id: str
    text: str
    author: str
    upvotes: int
    downvotes: int
    user_tag: str | None # user added tag for example "deaf"
    created_utc: float # created at UTC timestamp


class CommentEntity(RedditBaseEntity):
    replies: List["CommentEntity"]
    controversiality: float
    depth: int # How many nests are above this comment
    enriched_text: Optional[str] = None
    prior_comments_thread: Optional[List[str]]

    @classmethod
    def from_comment_response(cls, comment: RedditComment, prior_comments_thread: List[str] = list()) -> "CommentEntity":
        return cls(
            reddit_id=comment.id,
            text= comment.body,
            author=comment.author,
            upvotes= comment.ups,
            downvotes=comment.downs,
            user_tag=comment.author_flair_text,
            created_utc=comment.created_utc,
            controversiality=comment.controversiality,
            depth=comment.depth,
            prior_comments_thread = prior_comments_thread.copy(),
            replies= [
                CommentEntity.from_comment_response(reply, prior_comments_thread + [comment.body]) 
                for reply 
                in comment.replies.get_comments()
                ] if not isinstance(comment.replies , str) else []
            # [
                # (print(type(comment.replies)), RedditCommentEntity.from_comment_response(RedditResponse.model_validate_json(reply).get_comments(), prior_comments_texts + [comment.body]))
                # for reply in comment.replies
                #     if not isinstance(reply, str)
                #     ]
        )

class PostEntity (RedditBaseEntity):
    title: str
    subreddit: str # subreddit where the post was made in
    send_replies: bool # shows whether the author has send replies to the comments received

    permalink: str # e.g. '/r/deaf/comments/1mg82a6/is_there_a_polite_way_to_decline_signing/'   | this is used to retrieve the comments
    comments: List[CommentEntity]

    @classmethod
    def from_post_response(cls, post: RedditPost, comments: List[CommentEntity]):
        return cls(
            reddit_id=post.id,
            title=post.title,
            permalink=post.permalink,
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
    
    def save_to_db(self):
        pass



