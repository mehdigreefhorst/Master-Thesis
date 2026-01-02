# database/entities/post_entity.py
import json
import os
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.database.entities.base_entity import BaseEntity
from app.responses.reddit_post_comments_response import MediaMetaData, MediaMetaDataId, RedditComment, RedditPost, RedditResponse

class RedditBaseEntity(BaseEntity):
    reddit_id: str
    text: str
    author: str
    upvotes: int
    downvotes: int
    user_tag: str | None # user added tag for example "deaf"
    media_metadata: Optional[Dict[MediaMetaDataId, MediaMetaData]] = None
    created_utc: float # created at UTC timestamp


class CommentEntity(RedditBaseEntity):
    replies: Optional[List["CommentEntity"]] = None
    controversiality: float
    depth: int # How many nests are above this comment
    enriched_text: Optional[str] = None

    def has_media(self) -> bool:
        if self.media_metadata:
            return True
        
        return False



    @classmethod
    def from_comment_response(cls, comment: RedditComment) -> "CommentEntity":
        return cls(
            reddit_id=comment.id,
            text= comment.body,
            author=comment.author,
            upvotes= comment.ups,
            downvotes=comment.downs,
            user_tag=comment.author_flair_text,
            media_metadata=comment.media_metadata,
            created_utc=comment.created_utc,
            controversiality=comment.controversiality,
            depth=comment.depth,
            replies= [
                CommentEntity.from_comment_response(reply) 
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
    is_video: bool = False # Not trustworthy to detect video. If youtube video is embedded, it still says false
    preview: Optional[Dict] = None
    media: Optional[Dict] = None
    media_embed: Optional[Dict] = None
    secure_media: Optional[Dict] = None
    secure_media_embed: Optional[Dict] = None
    url: str = ""
    upvote_ratio: float = None
    comments: List[CommentEntity]

    def has_media(self) -> bool:
        if self.media_metadata:
            return True
        elif self.is_video:
            return True
        elif self.media:
            return True
        elif self.secure_media:
            return True
        elif self.media_embed:
            return True
        elif self.secure_media_embed:
            return True
        elif self.preview:
            return True
        
        return False


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
            media_metadata=post.media_metadata,
            is_video=post.is_video,
            media=post.media,
            media_embed=post.media_embed,
            secure_media=post.secure_media,
            secure_media_embed=post.secure_media_embed,
            url=post.url,
            upvote_ratio=post.upvote_ratio,
            user_tag=post.link_flair_text,
            created_utc=post.created_utc,
            subreddit=post.subreddit,
            send_replies=post.send_replies,
            comments=comments
            )
    
