from typing import Any, Dict, List, Literal, Tuple

from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
# from app.database.entities.base_entity import PyObjectId
from app.database.entities.base_entity import PyObjectId
from app.database.entities.post_entity import PostEntity

class PostRepository(BaseRepository[PostEntity]):
    def __init__(self, database: Database):
        super().__init__(database, PostEntity, "post")

    def find_by_author_sort(self, author: str) -> List[PostEntity]:
        data = super().find({"author": author})
        return sorted(data, key=lambda x: x.created_at, reverse=True)
    
    def find_all_from_reddit_post_ids(self, reddit_post_ids: List[str], user_id: PyObjectId) -> Tuple[List[str], List[str]]:
        filter = {"user_id": user_id, "reddit_id": {"$in": reddit_post_ids}}
        found_posts = super().find_ids(filter, {"reddit_id": 1})
        found_ids = [post["_id"] for post in found_posts]
        found_reddit_ids = [post["reddit_id"] for post in found_posts]
        return found_ids, found_reddit_ids

    

