
from flask_pymongo.wrappers import Database

from app.database.base_repository import BaseRepository
from app.database.entities.category_info import CategoryInfoEntity

class CategoryInfoRepository(BaseRepository[CategoryInfoEntity]):
    def __init__(self, database: Database):
        super().__init__(database, CategoryInfoEntity, "category_info")

