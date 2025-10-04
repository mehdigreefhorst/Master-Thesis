

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_scraper_repository, get_user_repository, get_scraper_cluster_repository
from app.requests.cluster_prep_requests import ScraperClusterId
from app.requests.scraping_commands import ScrapingId
from app.requests.scraper_requests import CreateScraperRequest
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.cluster_prep_service import ClusterPrepService
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_request_body
from app.utils.types import StatusType

scraper_bp = Blueprint("clustering", __name__, url_prefix="/clustering")


@scraper_bp.route("/prepare_cluster", methods=["POST"])
@validate_request_body()
@jwt_required
def prepare_cluster(body: ScraperClusterId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)
    
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if scraper_cluster_entity.scraper_entity_id:
        return jsonify(message="scraper has already been created before"), 204 # TODO: Not the right status code
    
    scraper_entity = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)
    if not scraper_entity:
        return jsonify(error=f"No scraper entity connected to scraper_cluster_entity = {scraper_cluster_entity.id}"), 400
    
    if scraper_entity.get_next_keyword():
        return jsonify(message=f"The scraper is not yet done as there are still pending keywords for with scraper_id = {scraper_entity.id} (keyword = {scraper_entity.get_next_keyword()})")
    
    scraper_cluster_entity.stages.scraping = StatusType.Completed
    scraper_cluster_entity.stages.cluster_prep = StatusType.Ongoing

    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)

    prompt = f"""
    # Instruction for creating a standalone LLM prompt
    """
    
    cluster_units_created = ClusterPrepService.start_preparing_clustering(scraper_cluster_entity, prompt)

    print(f"A total of {cluster_units_created} cluster units are created!")
    return jsonify(message=f"preparing the cluster is successful, a total of {cluster_units_created} cluster units are created"), 200