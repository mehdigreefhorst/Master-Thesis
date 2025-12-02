

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import get_category_info_repository
from app.utils.api_validation import validate_query_params, validate_request_body
from app.requests.category_info_requests import CreateCategoryInfoRequest, GetCategoryInfoRequest
from app.database.entities.category_info import CategoryInfoEntity

category_info_bp = Blueprint("category_info", __name__, url_prefix="/category_info")


@category_info_bp.route("/", methods=["POST"])
@validate_request_body(CreateCategoryInfoRequest)
@jwt_required()
def create_category_info(body: CreateCategoryInfoRequest):
    user_id = get_jwt_identity()

    category_info_entity = CategoryInfoEntity(user_id=user_id,
                                              category_name=body.category_name,
                                              category_description=body.category_description,
                                              is_public=body.is_public,
                                              labels=body.labels,
                                              llm_prediction_fields_per_label=body.llm_prediction_fields_per_label,
                                              multi_label_possible=body.multi_label_possible)
    
    get_category_info_repository().insert(category_info_entity)

    return jsonify(created_category_info_id=category_info_entity.id)


@category_info_bp.route("/", methods=["GET"])
@validate_query_params(GetCategoryInfoRequest)
@jwt_required()
def get_category_info(query: GetCategoryInfoRequest):
    user_id = get_jwt_identity()

    if query.category_info_id:
        category_info_entity = get_category_info_repository().find_by_id(query.category_info_id)
        if category_info_entity:
            return jsonify(category_info_entities=[category_info_entity.model_dump()]), 200

    category_info_entities = get_category_info_repository().find_available_category_info_for_user(user_id)
    
    if category_info_entities:
        return jsonify(category_info_entities=[category_info_entity.model_dump() for category_info_entity in category_info_entities]), 200
    
    return jsonify(category_info_entities=[]), 200

    
