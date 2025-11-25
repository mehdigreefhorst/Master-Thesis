
from flask import Blueprint, jsonify
from app.requests.model_requests import ModelId
from app.requests.profile_requests import UpdateProfile
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_user_repository
from app.responses.profile_response import ProfileResponse
from app.services.openrouter_analytics_service import OpenRouterCaching
from app.utils.api_validation import validate_query_params, validate_request_body

models_bp = Blueprint("models", __name__, url_prefix="/models")



@models_bp.route("/", methods=["GET"])
@jwt_required()
def get_models():
    user_id = get_jwt_identity()
    user_entity = get_user_repository().find_by_id(user_id)

    openrouter_data_entity = OpenRouterCaching().get_cached_or_todays()
    standard_api_response = openrouter_data_entity.dev_api_data

    return jsonify(models=standard_api_response), 200


@models_bp.route("/favorite", methods=["POST"])
@validate_query_params(ModelId)
@jwt_required()
def add_favorite_model(query: ModelId):
    user_id = get_jwt_identity()
    user_entity = get_user_repository().find_by_id(user_id)
    if query.model_id in user_entity.favorite_models:
        return jsonify(inserted=0), 200
    get_user_repository().insert_list_element({"_id": user_id}, "favorite_models", query.model_id)
    return jsonify(inserted=1), 200


@models_bp.route("/favorite", methods=["GET"])
@jwt_required()
def get_favorite_models():
    user_id = get_jwt_identity()
    user_entity = get_user_repository().find_by_id(user_id)
    
    return jsonify(favorite_models=user_entity.favorite_models), 200


@models_bp.route("/favorite", methods=["DELETE"])
@validate_query_params(ModelId)
@jwt_required()
def remove_favorite_model(query: ModelId):
    user_id = get_jwt_identity()
    user_entity = get_user_repository().find_by_id(user_id)
    if query.model_id not in user_entity.favorite_models:
        print("model to delete is not in favorite models")
        return jsonify(inserted=0), 200
    
    new_favorite_models = [model for model in user_entity.favorite_models if model != query.model_id]
    if len(new_favorite_models) < len(user_entity.favorite_models):
        print("We have removed a model!")
        get_user_repository().update(user_id, {"favorite_models": new_favorite_models})
        return jsonify(removed=1), 200
    
