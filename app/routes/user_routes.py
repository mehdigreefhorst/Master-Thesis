
from flask import Blueprint, jsonify
from app.requests.profile_requests import UpdateProfile
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_user_repository
from app.utils.api_validation import validate_request_body

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
