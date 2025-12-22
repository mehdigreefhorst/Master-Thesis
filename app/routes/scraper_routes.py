
from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_post_repository, get_scraper_cluster_repository, get_scraper_repository, get_user_repository
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity
from app.database.entities.user_entity import UserRole
from app.requests.scraping_commands import ScraperClusterId, ScrapingId
from app.requests.scraper_requests import CreateScraperRequest, GetScraper, ScraperUpdate
from app.responses.get_keyword_searches import GetKeywordSearches
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.post_service import PostService
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_request_body, validate_query_params
from app.utils.types import StatusType

scraper_bp = Blueprint("scraper", __name__, url_prefix="/scraper")

@scraper_bp.route("/", methods=["GET"])
@validate_query_params(GetScraper)
@jwt_required()
def get_scraper_entity(query: GetScraper):
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
    scraper_entities = get_scraper_repository().find_by_user_id(user_id)
    returnable_instances = [instance.model_dump() for instance in scraper_entities]
    return jsonify(returnable_instances), 200


@scraper_bp.route("/", methods=["POST"])
@validate_request_body(CreateScraperRequest)
@jwt_required()
def create_scraper_entity(body: CreateScraperRequest):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper has already been created before"), 409
    
    
    scraper_entity = ScraperService.create_scraper_entity(body, user_id)
    inserted_id = get_scraper_repository().insert(scraper_entity).inserted_id

    scraper_cluster_entity.stages.define = StatusType.Completed
    scraper_cluster_entity.scraper_entity_id = inserted_id

    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity) # TODO: this is not correct ,we also want to update the stages

    return jsonify(scraper_id=inserted_id), 200


@scraper_bp.route("/", methods=["PUT"])
@validate_request_body(ScraperUpdate)
@jwt_required()
def update_scraper(body: ScraperUpdate):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper entity has not been created "), 409

    scraper_entity = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)

    if not scraper_entity:
        return jsonify(error="no such scraper entity exists"), 401
    
    if scraper_entity.status in [StatusType.Completed, StatusType.Error,StatusType.Ongoing, StatusType.Paused]:
        return jsonify(error="Update is not possible. We scraper is already initialized, we cannot change it anymore"), 204
    
    if body.posts_per_keyword and isinstance(body.posts_per_keyword, int):
        if body.posts_per_keyword <= 0 or body.posts_per_keyword > 100:
            return jsonify(error="The posts per keyword has to be between 0 and 100 including a 100")
        scraper_entity.posts_per_keyword = body.posts_per_keyword
    
    if body.age and isinstance(body.age, str):
        scraper_entity.age = body.age

    if body.filter and isinstance(body.filter, int):
        scraper_entity.filter = body.filter
    updated = get_scraper_repository().update(scraper_entity.id, scraper_entity).modified_count

    return jsonify(f"updated the scraper route status = {updated}"), 200


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
        return jsonify(error="scraper entity has not been created "), 409
    
    scraper_cluster_entity.stages.scraping = StatusType.Paused
    
    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)
    
    scraper_entity = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)
    if not scraper_entity:
        return jsonify(error="no such scraper entity exists"), 401
    
    get_scraper_repository().update(scraper_entity.id, {"status": "paused"})

    return jsonify(message=f"{scraper_entity.id} is now paused"), 200


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
        return jsonify(error="scraper entity has not been created "), 409
    scraper_cluster_entity.stages.define = StatusType.Completed
    scraper_cluster_entity.stages.scraping = StatusType.Ongoing
    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)


    scraper_entity = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)
    print(scraper_entity)
    if not scraper_entity:
        return jsonify(error="no such scraper entity exists"), 401
    
    if scraper_entity.status == "ongoing":
        return jsonify(message="scraper is already busy!"), 200
    
    scraper_entity.status = "ongoing"
    get_scraper_repository().update(scraper_entity.id, {"status": scraper_entity.status})
    
    scraper_response = ScraperService().scrape_all_subreddits_keywords(scraper_entity)

    scraper_cluster_entity.stages.scraping = StatusType.Completed
    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)
    return jsonify(scraper_response.model_dump()), 200
 

@scraper_bp.route("/get_keyword_searches", methods=["GET"])
@validate_query_params(ScraperClusterId)
@jwt_required()
def get_keyword_searches(query: ScraperClusterId) -> GetKeywordSearches:
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper entity has not been created "), 409
    
    scraper_entity = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)

    if not scraper_entity:
        return jsonify(error="scraper entity is not findable"), 409
    
    return jsonify(ScraperService.get_all_post_ids_for_keyword_searches(scraper_entity).model_dump()), 200


@scraper_bp.route("/renew_all_post_entities", methods=["PUT"])
@jwt_required()
def renew_all_post_entities():
    """Took 3 hours to renew 1600 posts as we currently have in db"""
    """renews the post entities :TODO make a check that calls this function automatically, and only for the ones that need to be renewed. Such as by looking at date. Since in the future there could be 100.000s of posts in the DB"""
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    if not (current_user.role == UserRole.Admin):
        return jsonify(error="user must be an ADMIN!"), 400
    
    # for some reason it takes 35 seconds to load all of the documents :TODO fix this to make it quicker
    all_post_entities = get_post_repository().find({})

    updated_count = PostService().renew_posts_entities(all_post_entities)
    return jsonify(message=f"Successfully updated {updated_count} posts!"), 200
