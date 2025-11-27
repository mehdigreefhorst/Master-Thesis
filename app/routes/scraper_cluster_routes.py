from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_scraper_cluster_repository, get_scraper_repository, get_user_repository
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity
from app.requests.scraping_commands import ScrapingId
from app.requests.scraper_requests import CreateScraperClusterRequest, CreateScraperRequest, UpdateScraperClusterRequest
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_request_body, validate_query_params
from app.utils.types import StatusType

scraper_cluster_bp = Blueprint("scraper_cluster", __name__, url_prefix="/scraper_cluster")

@scraper_cluster_bp.route("/", methods=["GET"])
@jwt_required()
def get_scraper_cluster_instances():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401

    scraper_entities = get_scraper_cluster_repository().find_by_user_id(user_id)

    returnable_instances = [instance.model_dump() for instance in scraper_entities]
    print("len(returnable_instances) = ", len(returnable_instances))
    return jsonify(returnable_instances), 200

@scraper_cluster_bp.route("/<scraper_cluster_id>", methods=["GET"])
@jwt_required()
def get_scraper_cluster_by_id(scraper_cluster_id: str):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401

    scraper_cluster = get_scraper_cluster_repository().find_by_id_and_user(user_id, scraper_cluster_id)

    if not scraper_cluster:
        return jsonify(error=f"Scraper cluster with id {scraper_cluster_id} not found"), 404

    return jsonify(scraper_cluster.model_dump()), 200

@scraper_cluster_bp.route("/", methods=["POST"])
@validate_request_body(CreateScraperClusterRequest)
@jwt_required()
def create_scraper_cluster(body: CreateScraperClusterRequest):
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify("No valid user_id valid"), 400
    scraper_cluster_instance = ScraperClusterEntity(user_id=user_id, 
                                                    problem_exporation_description=body.problem_exporation_description, 
                                                    target_audience=body.target_audience,
                                                    )

    scraper_cluster_id = get_scraper_cluster_repository().insert(scraper_cluster_instance).inserted_id

    return jsonify(scraper_cluster_id=scraper_cluster_id), 200


@scraper_cluster_bp.route("/", methods=["PUT"])
@validate_request_body(UpdateScraperClusterRequest)
@jwt_required()
def update_scraper_cluster(body: UpdateScraperClusterRequest):
    user_id = get_jwt_identity()
    if not user_id:
        return jsonify("No valid user_id valid"), 400
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity or scraper_cluster_entity.stages.scraping != StatusType.Initialized:
        return jsonify("Cannot update the scraper instance if instance is already being processed")

    scraper_entity = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)
    
    if body.keywords:
        scraper_entity.keywords = body.keywords
    
    if body.subreddits:
        scraper_entity.subreddits = body.subreddits
    
    if body.problem_exporation_description:
        scraper_cluster_entity.problem_exporation_description = body.problem_exporation_description
    
    if body.target_audience:
        scraper_cluster_entity.target_audience = body.target_audience

    if body.keywords or body.subreddits:
        get_scraper_repository().update(scraper_entity.id, scraper_entity)
    
    if body.problem_exporation_description or body.target_audience:
        get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)

    return jsonify(scraper_cluster_id=scraper_cluster_entity.id), 200
