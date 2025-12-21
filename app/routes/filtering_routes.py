

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.database import get_user_repository
from app.database.entities.filtering_entity import FilteringFields
from app.requests.filtering_requests import FilteringRequest
from app.services.filtering_service import FilteringService
from app.utils.api_validation import validate_request_body
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
    
    
