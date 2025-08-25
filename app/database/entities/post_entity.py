
import json
import os
from typing import List, Optional
from pydantic import BaseModel
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from app.responses.reddit_post_comments_response import RedditComment, RedditPost, RedditResponse

class RedditBaseEntity(BaseModel):
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
    def from_comment_response(cls, comment: RedditComment, prior_comments_thread: List[str] = list()) -> "RedditCommentEntity":
        return cls(
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



class PostManager:
    """in this class we simplify the posts and comments into a more undertandable data structure
    that relates the posts and comments to its parent without the data and children attribute. This class also manages which query was executed to find the post 
    also it makes it easy restrict which posts and comments have already been scraped so that double execution is inhibited"""

    @staticmethod
    def save_reddit_post_conversation(post_entity: PostEntity):
        # save_to_db
        print("Saving to database code here!")
        return
    
    @staticmethod
    def create_reddit_post_conversation(post: RedditPost, comments: List[RedditComment]):
        """Transforms the response format of the reddit posts, into the structure that we would like to save in the database
        It is important to start with the comments first, because each of the comments have a thread and it might be very nested
        """
        post_title_content_text = post.title + "\n" + post.selftext
        comment_entities = [CommentEntity.from_comment_response(comment, [post_title_content_text]) for comment in comments]
        post_entity = PostEntity.from_post_response(post, comment_entities)
        with open("data/post_entity.json", "w") as f:
            f.write(post_entity.model_dump_json(indent=4))
        # now call the database to update with the post with its comments

        # now enrich the object with LLM to make a comment more full of information. 

    
if __name__ == "__main__":
    reddit_post_manager = PostManager()
    with open("data/cached_post1.json") as f:
        post = RedditPost.model_validate_json(f.read())
    with open("data/cached_comments1.json") as f:
        comments = json.loads(f.read())
        comments = [RedditComment.model_validate(comment) for comment in comments]
    
    PostManager.create_reddit_post_conversation(post, comments)