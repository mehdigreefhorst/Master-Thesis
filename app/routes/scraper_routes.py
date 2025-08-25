
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_scraper_repository, get_user_repository
from app.requests.scraping_commands import ScrapingCommands
from app.responses.reddit_post_comments_response import RedditResponse
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