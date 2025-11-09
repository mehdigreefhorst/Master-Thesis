
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_scraper_cluster_repository, get_scraper_repository, get_user_repository
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity
from app.requests.scraping_commands import ScraperClusterId, ScrapingId
from app.requests.scraper_requests import CreateScraperRequest, GetScraper
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_request_body, validate_query_params
from app.utils.types import StatusType

scraper_bp = Blueprint("scraper", __name__, url_prefix="/scraper")

@scraper_bp.route("/", methods=["GET"])
@validate_query_params(GetScraper)
@jwt_required()
def get_scraper_instance(query: GetScraper):
    print("Scraper instance retrieved ")
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401

    # If scraper_cluster_id is provided, find scraper by cluster id
    if query.scraper_cluster_id:
        scraper_cluster_instance = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)
        if not scraper_cluster_instance:
            return jsonify(error=f"ScraperCluster for scrapercluster id {query.scraper_cluster_id} not found"), 400
        scraper = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_instance.scraper_entity_id)
        if not scraper:
            return jsonify(error=f"Scraper for scrapercluster id {query.scraper_cluster_id} not found"), 404
        return jsonify(scraper.model_dump()), 200

    # Otherwise, return all scrapers for the user
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
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if scraper_cluster_entity.scraper_entity_id:
        return jsonify(message="scraper has already been created before"), 409
    
    
    scraper_instance = ScraperService.create_scraper_instance(body, user_id)
    inserted_id = get_scraper_repository().insert(scraper_instance).inserted_id

    scraper_cluster_entity.stages.define = StatusType.Completed
    scraper_cluster_entity.scraper_entity_id = inserted_id

    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity) # TODO: this is not correct ,we also want to update the stages

    return jsonify(scraper_id=inserted_id), 200

@scraper_bp.route("/pause", methods=["PUT"])
@validate_request_body(ScraperClusterId)
@jwt_required()
def pause_scraper(body: ScraperClusterId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(message="scraper entity has not been created "), 409
    
    scraper_cluster_entity.stages.scraping = StatusType.Paused
    
    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)
    
    scraper_instance = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)
    if not scraper_instance:
        return jsonify(error="no such scraper instance exists"), 401
    
    get_scraper_repository().update(scraper_instance.id, {"status": "paused"})

    return jsonify(message=f"{scraper_instance.id} is now paused"), 200


@scraper_bp.route("/start", methods=["PUT"])
@validate_request_body(ScraperClusterId)
@jwt_required()
def start_scraper(body: ScraperClusterId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(message="scraper entity has not been created "), 409
    scraper_cluster_entity.stages.define = StatusType.Completed
    scraper_cluster_entity.stages.scraping = StatusType.Ongoing
    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)


    scraper_instance = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)
    print(scraper_instance)
    if not scraper_instance:
        return jsonify(error="no such scraper instance exists"), 401
    
    if scraper_instance.status == "ongoing":
        return jsonify(message="scraper is already busy!"), 200
    
    scraper_instance.status = "ongoing"
    get_scraper_repository().update(scraper_instance.id, {"status": scraper_instance.status})
    
    scraper_response = ScraperService().scrape_all_subreddits_keywords(scraper_instance)

    scraper_cluster_entity.stages.scraping = StatusType.Completed
    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)
    return jsonify(scraper_response.model_dump()), 200
    return jsonify(message="successfully scraped the scraper instance on reddit")

    