
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_scraper_repository, get_user_repository
from app.requests.scraping_commands import ScrapingCommands
from app.requests.scraper_requests import CreateScraperRequest
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_request_body

scraper_bp = Blueprint("scraper", __name__, url_prefix="/scraper")

@scraper_bp.route("/", methods=["GET"])
@jwt_required()
def get_scraper_instances():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_instances = get_scraper_repository().find_by_user_id(user_id)

    returnable_instances = [instance.model_dump() for instance in scraper_instances]
    return jsonify(returnable_instances), 200


@scraper_bp.route("/", methods=["POST"])
@validate_request_body(CreateScraperRequest)
@jwt_required()
def create_scraper_instance(body: CreateScraperRequest):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_instance = ScraperService.create_scraper_instance(body, user_id)
    result = get_scraper_repository().insert(scraper_instance)
    result.inserted_id

    return jsonify(scraper_instance=result.inserted_id)

