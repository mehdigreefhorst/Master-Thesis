from typing import Any, Dict, List, Literal, Mapping, Type, Optional

import pymongo
from flask_pymongo.wrappers import Database
from pydantic import BaseModel
from pymongo.results import InsertOneResult, UpdateResult, InsertManyResult


from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.utils import utc_timestamp


class PaginatedEntities[T: BaseEntity](BaseModel):
    content: List[T]
    total_size: int


class BaseRepository[T: BaseEntity]:
    def __init__(self, database: Database, model_class: Type[T], collection_name: str):
        self.db = database
        self.model_class = model_class

        from app.database import DATABASE_OPTIONS
        self.collection = self.db.get_collection(collection_name, DATABASE_OPTIONS)

    def insert(self, item: T) -> InsertOneResult:
        data = item.dump_for_database()
        return self.collection.insert_one(data)
    
    def insert_list_entities(self, items: List[T]) -> InsertManyResult:
        data_list = [item.dump_for_database() for item in items]
        return self.collection.insert_many(data_list)
        

    def find(self, filter: Dict[str, Any]) -> List[T]:
        documents = self.collection.find(self._soft_delete_filter(filter))
        entities = list(map(self._convert_to_entity, documents))
        return entities

    def find_sort(self,
                  filter: Dict[str, Any],
                  fields: str | List[str],
                  direction: int = pymongo.ASCENDING,
                  page: Optional[int] = None,
                  size: Optional[int] = None) -> PaginatedEntities[T]:
        """Finds a list of entities, with the ability to filter, paginate and sort."""
        filter_with_soft_delete = self._soft_delete_filter(filter)

        cursor = (
            self.collection
            .find(filter_with_soft_delete)
            .sort(fields, direction)
            )

        if page is not None and size is not None:
            cursor = (cursor
                      .skip(page * size)
                      .limit(size))

        entities = list(map(self._convert_to_entity, cursor))
        total_size = self.collection.count_documents(filter_with_soft_delete)

        return PaginatedEntities(content=entities, total_size=total_size)

    def find_one(self, filter: Dict[str, Any], fields: list[str] | None = None) -> T | None:
        projection = None
        if fields:
            projection = {"_id": 1}
            projection.update({field: 1 for field in fields})
        
        document = self.collection.find_one(self._soft_delete_filter(filter), projection)

        if not document:
            return None
        
        # If fields are requested, return raw dict instead of entity
        if fields:
            return document
        return self._convert_to_entity(document)

    def find_by_id(self, id: PyObjectId, fields: list[str] | None = None) -> T | None:
        return self.find_one({"_id": id}, fields)
        
    
    

    def update(self, id: PyObjectId, to_update: Mapping[str, Any] | T) -> UpdateResult:
        if isinstance(to_update, BaseEntity):  # Cannot do 'isinstance(..., T)' so we use BaseEntity instead.
            to_update = dict(to_update.dump_for_database())
            del to_update["_id"]
        to_update["updated_at"] = utc_timestamp()

        filter = self._soft_delete_filter({"_id": id})
        return self.collection.update_one(filter, {"$set": to_update})

    def delete(self, id: PyObjectId) -> UpdateResult:
        return self.update(id, {"deleted_at": utc_timestamp()})

    def _convert_to_entity(self, obj: Mapping[str, Any]) -> T:
        return self.model_class.model_validate(obj)

    def _soft_delete_filter(self, existing_filter: Dict[str, Any]) -> Dict[str, Any]:
        new_filter = existing_filter.copy()
        new_filter["deleted_at"] = None
        return new_filter
    
    def find_ids(self, filter: Dict[str, Any], fields_to_include: Dict[str, Literal[0, 1]] = dict()) -> List[PyObjectId]:
        """
        Returns only the document IDs (_id) matching the filter.
        If fields_to_include is given, also those fields will be returned
        This avoids converting to full entities and speeds up queries.
        """
        filter_with_soft_delete = self._soft_delete_filter(filter)
        projection = {"_id": 1}
        projection.update(fields_to_include)
        return self.collection.find(filter_with_soft_delete, projection)
    
    def insert_list_element(self, filter: Dict[str, Any], mongo_db_variable_path: str, list_element_to_append: Any):
        """
        if multiple adding.   -> mycol.update_one({'name': 'Jane Doe'}, {'$push': {'interests': {'$each': ['hiking', 'swimming']}}}) 
        if one element adding -> mycol.update_one({'name': 'John Doe'}, {'$push': {'interests': 'gardening'}}) 
        if complex adding     -> mycol.update_one({'title': 'MongoDB Basics'}, {'$push': {'authors': {'name': 'Jane Smith', 'affiliation': 'University of MongoDB'}}})
        """
        filter_with_soft_delete = self._soft_delete_filter(filter)
        if isinstance(list_element_to_append, (set, list)):
            return self.collection.update_one(filter_with_soft_delete, {"$push": {mongo_db_variable_path: {"$each": list_element_to_append}}})
        else:
            return self.collection.update_one(filter_with_soft_delete, {"$push": {mongo_db_variable_path: list_element_to_append}})

