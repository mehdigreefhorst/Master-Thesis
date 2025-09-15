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
    
    def find_existing_post_entities_from_reddit_post_ids(self, reddit_post_ids: List[str]) -> Tuple[List[PyObjectId], List[str]]:
        pipeline = [
            {"$match": {
                "reddit_id": {"$in": reddit_post_ids},
                "deleted_at": None,  # keep your soft-delete filter
            }},
            # newest first per reddit_id
            {"$sort": {"reddit_id": 1, "updated_at": -1}},  # ← change updated_at if needed
            # keep only the first (newest) doc for each reddit_id
            {"$group": {
                "_id": "$reddit_id",
                "latest_id": {"$first": "$_id"},
            }},
            # (optional) project exactly what you want back
            {"$project": {"_id": 0, "reddit_id": "$_id", "latest_id": 1}},
        ]

        docs = list(self.collection.aggregate(pipeline))
        latest_ids      = [d["latest_id"] for d in docs]
        latest_reddit_ids = [d["reddit_id"] for d in docs]
        return latest_ids, latest_reddit_ids
        
        filter = {"reddit_id": {"$in": reddit_post_ids}}


        found_posts = super().find_ids(filter, {"reddit_id": 1})
        found_post_entity_ids_and_reddit_ids = [(post["_id"], post["reddit_id"]) for post in found_posts]
        
        found_ids = [pair[0] for pair in found_post_entity_ids_and_reddit_ids]
        found_reddit_ids = [pair[1] for pair in found_post_entity_ids_and_reddit_ids]

        return found_ids, found_reddit_ids

    

