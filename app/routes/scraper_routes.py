
from flask import Blueprint, jsonify
# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_user_repository
from app.requests.scraping_commands import ScrapingCommands
from app.responses.reddit_post_comments_response import RedditResponse
from app.utils.api_validation import validate_request_body

scraper_bp = Blueprint("scraper", __name__, url_prefix="/scraper")

