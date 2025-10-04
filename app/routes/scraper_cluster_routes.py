from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_scraper_cluster_repository, get_scraper_repository, get_user_repository
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity
from app.requests.scraping_commands import ScrapingId
from app.requests.scraper_requests import CreateScraperRequest
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_request_body

scraper_cluster_bp = Blueprint("scraper_cluster", __name__, url_prefix="/scraper_cluster")

@scraper_cluster_bp.route("/", methods=["GET"])
@jwt_required()
def get_scraper_cluster_instances():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_instances = get_scraper_cluster_repository().find_by_user_id(user_id)

    returnable_instances = [instance.model_dump() for instance in scraper_instances]
    return jsonify(returnable_instances), 200

@scraper_cluster_bp.route("/create", methods=["POST"])
@jwt_required()
def create_scraper_cluster():
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify("No valid user_id valid"), 400
    scraper_cluster_instance = ScraperClusterEntity(user_id=user_id)

    scraper_cluster_id = get_scraper_cluster_repository().insert(scraper_cluster_instance).inserted_id

    return jsonify(scraper_cluster_id=scraper_cluster_id), 200
