
from flask import Blueprint, jsonify
from app.requests.model_requests import ModelId
from app.requests.profile_requests import UpdateProfile
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_user_repository
from app.responses.profile_response import ProfileResponse
from app.utils.api_validation import validate_query_params, validate_request_body

user_bp = Blueprint("user", __name__, url_prefix="/user")


@user_bp.route("/", methods=["GET"])
@jwt_required()
def get_user_profile():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    response_json = current_user.model_dump()
    response = ProfileResponse.model_validate(response_json)
    return jsonify(response.model_dump()), 200


@user_bp.route("/", methods=["PUT"])
@validate_request_body(UpdateProfile)
@jwt_required()
def update_user_profile(body: UpdateProfile):
    user_id = get_jwt_identity()
    get_user_repository().update(id=user_id, to_update=body.model_dump())
    return jsonify(), 200
    

@user_bp.route("/favorite_model", methods=["POST"])
@validate_query_params(ModelId)
@jwt_required()
def add_favorite_model(query: ModelId):
    user_id = get_jwt_identity()
    user_entity = get_user_repository().find_by_id(user_id)
    if query.model_id in user_entity.favorite_models:
        return jsonify(inserted=0), 200
    get_user_repository().insert_list_element({"_id": user_id}, "favorite_models", query.model_id)
    return jsonify(inserted=1), 200


@user_bp.route("/favorite_model", methods=["GET"])
@jwt_required()
def get_favorite_models():
    user_id = get_jwt_identity()
    user_entity = get_user_repository().find_by_id(user_id)
    
    return jsonify(favorite_models=user_entity.favorite_models), 200


@user_bp.route("/favorite_model", methods=["DELETE"])
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