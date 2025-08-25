from typing import List

from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
# from app.database.entities.base_entity import PyObjectId
from app.database.entities.post_entity import PostEntity

class PostRepository(BaseRepository[PostEntity]):
    def __init__(self, database: Database):
        super().__init__(database, PostEntity, "post")

    def find_by_author_sort(self, author: str) -> List[PostEntity]:
        data = super().find({"author": author})
        return sorted(data, key=lambda x: x.created_at, reverse=True)
