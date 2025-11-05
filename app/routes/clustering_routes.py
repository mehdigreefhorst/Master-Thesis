

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_cluster_unit_repository, get_scraper_repository, get_user_repository, get_scraper_cluster_repository
from app.requests.cluster_prep_requests import GetClusterUnitsRequest, ScraperClusterId, UpdateGroundTruthRequest
from app.requests.scraping_commands import ScrapingId
from app.requests.scraper_requests import CreateScraperRequest
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.cluster_prep_service import ClusterPrepService
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_query_params, validate_request_body
from app.utils.types import StatusType

clustering_bp = Blueprint("clustering", __name__, url_prefix="/clustering")


@clustering_bp.route("/prepare_cluster", methods=["POST"])
@validate_request_body(ScraperClusterId)
@jwt_required()
def prepare_cluster(body: ScraperClusterId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)
    
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(message="scraper is not yet initialized"), 409
    
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(message="scraper is not completed yet"), 409
    
    if scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        return jsonify(message="Cluster preparation is already completed"), 409
    
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
    scraper_cluster_entity.stages.cluster_prep = StatusType.Completed

    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)


    print(f"A total of {cluster_units_created} cluster units are created!")
    return jsonify(message=f"preparing the cluster is successful, a total of {cluster_units_created} cluster units are created"), 200


@clustering_bp.route("/enrich_cluster_text", methods=["POST"])
@validate_request_body(ScraperClusterId)
@jwt_required()
def enrich_cluster_text(body: ScraperClusterId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)
    
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(message="scraper is not yet initialized"), 409 
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(message="scraper is not completed yet"), 409
    
    if not scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        return jsonify(message="Cluster preparation is not completed"), 409
    
    # :TODO Call the LLM for each comment
    ClusterPrepService.enrich_cluster_units(scraper_cluster_entity)


    
@clustering_bp.route("/get_cluster_units", methods=["GET"])
@validate_query_params(GetClusterUnitsRequest)
@jwt_required()
def get_cluster_units(query: GetClusterUnitsRequest):
    print("query = ", query)
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)
    
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(message="scraper is not yet initialized"), 409
    
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(message="scraper is not completed yet"), 409
    
    if not scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        return jsonify(message="Cluster preparation is no completed"), 409
    
    print("query.reddit_message_type = ",query.reddit_message_type)
    returnable_cluster_units = ClusterPrepService.convert_cluster_units_to_bertopic_ready_documents(scraper_cluster_entity, query.reddit_message_type)
    print("a total of units = ", len(returnable_cluster_units))
    if returnable_cluster_units:
        return jsonify(cluster_unit_entities=returnable_cluster_units), 200
    

@clustering_bp.route("/update_ground_truth", methods=["PUT"])
@validate_request_body(UpdateGroundTruthRequest)
@jwt_required()
def update_ground_truth(body: UpdateGroundTruthRequest):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    get_cluster_unit_repository().find({"cluster_entity_id": body.cluster_entity_id})

    result = get_cluster_unit_repository().update_ground_truth_category(body.cluster_entity_id,
                                                                        body.ground_truth_category,
                                                                        body.ground_truth)
    
    print("result of the update = ", result)
    return jsonify(result=result.modified_count)
    