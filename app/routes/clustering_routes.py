

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_cluster_unit_repository, get_scraper_repository, get_user_repository, get_scraper_cluster_repository
from app.requests.cluster_prep_requests import GetClusterUnitsRequest, ScraperClusterId, UpdateGroundTruthRequest
from app.requests.filter_requests import FilterClusterUnitsRequest
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
    
    cluster_units_created = ClusterPrepService.start_preparing_clustering(scraper_cluster_entity)
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
        return jsonify(returnable_cluster_units), 200
    else:
        return jsonify(error="There are no cluster unit entities for the scraper cluster instance"), 400
    

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


@clustering_bp.route("/filter_cluster_units", methods=["GET"])
@validate_query_params(FilterClusterUnitsRequest)
@jwt_required()
def filter_cluster_units(query: FilterClusterUnitsRequest):
    """
    Filter cluster units based on various criteria including:
    - Subreddits, authors, upvotes/downvotes range
    - Ground truth and predictions existence
    - Specific ground truth labels
    - Specific predicted labels from experiments
    """
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401

    # Verify user has access to this scraper cluster
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(
        user_id, query.scraper_cluster_id
    )
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find scraper_cluster_id={query.scraper_cluster_id}"), 400

    # Build MongoDB filter dictionary
    filter_dict = {}

    # Filter by message type
    if query.reddit_message_type != "all":
        filter_dict["type"] = query.reddit_message_type

    # Filter by subreddits
    if query.subreddits:
        filter_dict["subreddit"] = {"$in": query.subreddits}

    # Filter by authors
    if query.authors:
        filter_dict["author"] = {"$in": query.authors}

    # Filter by upvotes range
    upvote_filter = {}
    if query.upvotes_min is not None:
        upvote_filter["$gte"] = query.upvotes_min
    if query.upvotes_max is not None:
        upvote_filter["$lte"] = query.upvotes_max
    if upvote_filter:
        filter_dict["upvotes"] = upvote_filter

    # Filter by downvotes range
    downvote_filter = {}
    if query.downvotes_min is not None:
        downvote_filter["$gte"] = query.downvotes_min
    if query.downvotes_max is not None:
        downvote_filter["$lte"] = query.downvotes_max
    if downvote_filter:
        filter_dict["downvotes"] = downvote_filter

    # Filter by ground truth existence
    if query.has_ground_truth is not None:
        if query.has_ground_truth:
            filter_dict["ground_truth"] = {"$ne": None}
        else:
            filter_dict["ground_truth"] = None

    # Filter by specific ground truth labels
    if query.ground_truth_labels:
        # Units must have ALL specified labels set to true
        for label in query.ground_truth_labels:
            filter_dict[f"ground_truth.{label}"] = True

    # Filter by predictions existence
    if query.has_predictions is not None:
        if query.has_predictions:
            filter_dict["predicted_category"] = {"$ne": None, "$ne": {}}
        else:
            # Either null or empty dict
            filter_dict["$or"] = [
                {"predicted_category": None},
                {"predicted_category": {}}
            ]

    # Filter by specific predicted labels for a given experiment
    if query.predicted_labels and query.experiment_id:
        # Units must have ALL specified labels predicted as true for this experiment
        for label in query.predicted_labels:
            filter_dict[f"predicted_category.{str(query.experiment_id)}.{label}"] = True

    # Determine sort parameters
    sort_field = query.sort_by or "created_utc"
    sort_direction = -1 if (query.sort_order or "desc") == "desc" else 1

    # Apply pagination
    skip = query.skip or 0
    limit = query.limit or 1000

    # Execute filtered query
    filtered_units = get_cluster_unit_repository().find_filtered(
        scraper_cluster_entity.id,
        filter_dict,
        sort_field,
        sort_direction,
        skip,
        limit
    )

    # Get total count for pagination info
    total_count = get_cluster_unit_repository().count_filtered(
        scraper_cluster_entity.id,
        filter_dict
    )

    # Convert to JSON-serializable format
    returnable_units = [unit.model_dump() for unit in filtered_units]

    return jsonify({
        "cluster_units": returnable_units,
        "total_count": total_count,
        "returned_count": len(returnable_units),
        "skip": skip,
        "limit": limit
    }), 200
