import json
from typing import List
from app.database import get_post_repository
from app.database.entities.post_entity import CommentEntity, PostEntity
from app.responses.reddit_post_comments_response import RedditComment, RedditPost


class PostService:
    """handles the post and comments advanced data modeling"""
    """in this class we simplify the posts and comments into a more undertandable data structure
    that relates the posts and comments to its parent without the data and children attribute. This class also manages which query was executed to find the post 
    also it makes it easy restrict which posts and comments have already been scraped so that double execution is inhibited"""

    @staticmethod
    def save_reddit_post_conversation(post_entity: PostEntity):
        # save_to_db
        print("Saving to database code here!")
        return
    
    @staticmethod
    def create_reddit_post_entity(reddit_post: RedditPost, reddit_comments: List[RedditComment]) -> PostEntity:
        """Transforms the response format of the reddit posts, into the structure that we would like to save in the database
        It is important to start with the comments first, because each of the comments have a thread and it might be very nested
        """
        post_title_content_text = reddit_post.title + "\n" + reddit_post.selftext
        comment_entities = [CommentEntity.from_comment_response(comment, [post_title_content_text]) for comment in reddit_comments]
        post_entity = PostEntity.from_post_response(reddit_post, comment_entities)
        with open("data/post_entity.json", "w") as f:
            f.write(post_entity.model_dump_json(indent=4))
        # now call the database to update with the post with its comments

        return post_entity
    
    @staticmethod
    def insert_into_db(post: PostEntity) -> None:
        get_post_repository().insert(post)



    
if __name__ == "__main__":
    reddit_post_manager = PostService()
    with open("data/cached_post1.json") as f:
        post = RedditPost.model_validate_json(f.read())
    with open("data/cached_comments1.json") as f:
        comments = json.loads(f.read())
        comments = [RedditComment.model_validate(comment) for comment in comments]
    
    PostService.create_reddit_post_entity(post, comments)