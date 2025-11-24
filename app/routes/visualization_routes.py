
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_user_repository
from app.services.openrouter_analytics_service import OpenRouterAnalyticsService, OpenRouterCaching, OpenRouterModelData
from app.utils.api_validation import validate_request_body, validate_query_params

visualization_bp = Blueprint("visualization", __name__, url_prefix="/visualization")


@visualization_bp.route("/", methods=["GET"])
@jwt_required()
def get_visualization():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    #openrouter_entity = OpenRouterAnalyticsService().get_cached_or_todays()
    openrouter_model = OpenRouterModelData.from_api_data()
    figure8 = OpenRouterAnalyticsService().create_figure_avg_tokens_vs_price(openrouter_model)
    
    return jsonify(figure_str=figure8), 200
