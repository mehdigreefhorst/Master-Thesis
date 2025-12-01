

from flask import Blueprint
from flask_jwt_extended import jwt_required, get_current_user
from app.utils.api_validation import validate_request_body
from app.requests.category_info_requests import CreateCategoryInfoRequest

category_info_bp= Blueprint("category_info", __name__, "/category_info")


@category_info_bp.route("/", methods=["POST"])
@validate_request_body(CreateCategoryInfoRequest)
@jwt_required()
def create_category_info(body: CreateCategoryInfoRequest):
    user_id = get_current_user()

    

