
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.user_entity import UserEntity

class UserRepository(BaseRepository[UserEntity]):
    def __init__(self, database: Database):
        super().__init__(database, UserEntity, "user")

    def find_by_email(self, email: str) -> UserEntity | None:
        return super().find_one({"email": email})