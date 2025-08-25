import bcrypt
import flask
from flask import Blueprint, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, create_refresh_token

from app.database import get_user_repository
from app.database.entities.user_entity import UserEntity, UserRole

from app.requests.login_request import LoginRequest
from app.requests.signup_request import SignupRequest
from app.utils.api_validation import validate_request_body

EXCLUDE_FOR_REFRESH = {
    "/auth/login",
    "/auth/signup",
    "/auth/logout",
}


auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.route("/login", methods=["POST"])
@validate_request_body(LoginRequest)
def login(body: LoginRequest):
    user = get_user_repository().find_by_email(body.email.lower())
    if not user:
        return jsonify(error="No such user"), 401

    if bcrypt.checkpw(body.password.encode("utf-8"), user.password):
        return token_response(user.id), 200
    else:
        return jsonify(error="Incorrect password"), 401


@auth_bp.route("/signup", methods=["POST"])
@jwt_required()
@validate_request_body(SignupRequest)
def signup(body: SignupRequest):
    current_user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(current_user_id)
    if not current_user or current_user.role != UserRole.Admin:
        return jsonify(message="Cannot create a user"), 403

    existing_user = get_user_repository().find_by_email(body.email.lower())
    if existing_user:
        return jsonify(message="Email is already in use"), 409

    hashed_password = bcrypt.hashpw(body.password.encode("utf-8"), bcrypt.gensalt())

    user = UserEntity(
        email=body.email,
        password=hashed_password,
        role=body.role,
    )
    insert_result = get_user_repository().insert(user)
    return jsonify(user_id=insert_result.inserted_id), 201


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    return token_response(user_id), 200


def token_response(identity: str) -> flask.Response:
    access_token = create_access_token(identity=identity)
    refresh_token = create_refresh_token(identity=identity)
    return jsonify(access_token=access_token, refresh_token=refresh_token)
