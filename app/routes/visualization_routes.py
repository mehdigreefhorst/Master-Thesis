
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_user_repository
from app.services.openrouter_analytics_service import OpenRouterAnalyticsService
from app.utils.logging_config import get_logger

# Initialize logger for this module
logger = get_logger(__name__)

visualization_bp = Blueprint("visualization", __name__, url_prefix="/visualization")


@visualization_bp.route("/", methods=["GET"])
@jwt_required()
def get_visualization():
    """Generate visualization figures for OpenRouter analytics."""
    user_id = get_jwt_identity()

    logger.info("Visualization request", extra={'extra_fields': {'user_id': str(user_id)}})

    try:
        # Auth check
        if not get_user_repository().find_by_id(user_id):
            logger.warning("Unauthorized access", extra={'extra_fields': {'user_id': str(user_id)}})
            return jsonify(error="No such user"), 401

        # Delegate to service
        figures = OpenRouterAnalyticsService().generate_all_figures()

        logger.info("Visualizations generated", extra={'extra_fields': {'count': len(figures)}})
        return jsonify(figure_list=figures), 200

    except Exception as e:
        logger.error(f"Visualization failed: {str(e)}", exc_info=True)
        return jsonify(error="Failed to generate visualizations"), 500
