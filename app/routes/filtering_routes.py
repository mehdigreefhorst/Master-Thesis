

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.database import get_filtering_repository, get_user_repository
from app.database.entities.filtering_entity import FilteringEntity, FilteringFields
from app.requests.filtering_requests import FilteringCreateRequest, FilteringEntityId, FilteringRequest, GetFilteringEntities
from app.services.filtering_service import FilteringService
from app.utils.api_validation import validate_query_params, validate_request_body
from app.utils.logging_config import get_logger
from app.utils.types import StatusType


logger = get_logger(__name__)


filtering_bp = Blueprint("filtering", __name__, url_prefix="/filtering")

@filtering_bp.route("/count", methods=["POST"])
@validate_request_body(FilteringFields)
@jwt_required()
def get_filtering_count(body: FilteringFields):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    cluster_unit_entities, experiment_entity = FilteringService().get_input_cluster_units(body.input_id, body.input_type)
    print("cluster_unit_entities = ", len(cluster_unit_entities))
    print("body= ", body)
    filtered_cluster_unit_entities = FilteringService().filter_cluster_units(cluster_unit_entities=cluster_unit_entities,
                                                                             filtering_fields=body,
                                                                             experiment_entity=experiment_entity)
    return jsonify(after_filtering=len(filtered_cluster_unit_entities), before_filtering=len(cluster_unit_entities)), 200
    
    
@filtering_bp.route("/cluster_units", methods=["POST"])
@validate_request_body(FilteringRequest)
@jwt_required()
def get_filtering_cluster_units(body: FilteringRequest):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    cluster_unit_entities, experiment_entity = FilteringService().get_input_cluster_units(body.input_id, body.input_type)
        
    filtered_cluster_unit_entities = FilteringService().filter_cluster_units(cluster_unit_entities=cluster_unit_entities,
                                                                             filtering_fields=body,
                                                                             experiment_entity=experiment_entity)
    returnable_entities = [cluster_unit_entity.model_dump() for cluster_unit_entity in filtered_cluster_unit_entities[:body.limit]]
    return jsonify(filtered_cluster_units=returnable_entities), 200
    
    
@filtering_bp.route("/create", methods=["POST"])
@validate_request_body(FilteringCreateRequest)
@jwt_required()
def create_filtering_entity(body: FilteringCreateRequest):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    inserted_filtering_entity_id = FilteringService().create_filter_entity_from_body(filtering_fields=body.filtering_fields,
                                                                                     user_id=user_id,
                                                                                     scraper_cluster_id=body.scraper_cluster_id)
    
    return jsonify(inserted_filtering_entity_id=inserted_filtering_entity_id), 200


@filtering_bp.route("/delete", methods=["DELETE"])
@validate_query_params(FilteringEntityId)
@jwt_required()
def delete_filtering_entity(query: FilteringEntityId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    filtering_entity = get_filtering_repository().find_by_id(query.filtering_entity_id)
    if not filtering_entity:
        return jsonify(error=f"filtering entity with id {query.filtering_entity_id} is not found"), 401
    
    raise Exception("Now we must check if we are allowed to remove the entity")
    
    # Check if used as input for other filtering entity, experiment entity

    
    return jsonify(inserted_filtering_entity_id=inserted_filtering_entity_id), 200



@filtering_bp.route("/", methods=["GET"])
@validate_query_params(GetFilteringEntities)
@jwt_required()
def get_filtering_entities(query: GetFilteringEntities):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    if query.filtering_entity_id:
    
        filtering_entity = get_filtering_repository().find_by_id(query.filtering_entity_id)
        if not filtering_entity:
            return jsonify(error=f"filtering entity with id {query.filtering_entity_id} is not found"), 401
        
        return jsonify(filtering_entity.model_dump()), 200
    
    if query.scraper_cluster_id:
        filtering_entities = get_filtering_repository().find({"scraper_cluster_id": query.scraper_cluster_id})

        if not filtering_entities:
            return jsonify(message=f"no filtering entities found for scraper_cluster_id: {query.scraper_cluster_id}")
        
        returnable_entities = [filtering_entity.model_dump() for filtering_entity in filtering_entities]
        return jsonify(returnable_entities), 200
    
    return jsonify(error=f"nothing found "), 400
    
  