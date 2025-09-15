

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_scraper_repository, get_user_repository
from app.requests.scraping_commands import ScrapingId
from app.requests.scraper_requests import CreateScraperRequest
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_request_body

scraper_bp = Blueprint("clustering", __name__, url_prefix="/clustering")
