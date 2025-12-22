

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

# from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_cluster_unit_repository, get_label_template_repository, get_sample_repository, get_scraper_repository, get_user_repository, get_scraper_cluster_repository
from app.requests.cluster_prep_requests import GetClusterUnitsRequest, PrepareClusterRequest, ScraperClusterId, UpdateGroundTruthPerLabelRequest, UpdateGroundTruthRequest
from app.requests.scraping_commands import ScrapingId
from app.requests.scraper_requests import CreateScraperRequest
from app.responses.reddit_post_comments_response import RedditResponse
from app.services.cluster_prep_service import ClusterPrepService
from app.services.label_template_service import LabelTemplateService
from app.services.scraper_service import ScraperService

from app.utils.api_validation import validate_query_params, validate_request_body
from app.utils.logging_config import get_logger
from app.utils.types import StatusType

logger = get_logger(__name__)

clustering_bp = Blueprint("clustering", __name__, url_prefix="/clustering")


@clustering_bp.route("/prepare_cluster", methods=["POST"])
@validate_request_body(PrepareClusterRequest)
@jwt_required()
def prepare_cluster(body: PrepareClusterRequest):
    user_id = get_jwt_identity()
    logger.info(f"[prepare_cluster] Request received for user_id={user_id}, scraper_cluster_id={body.scraper_cluster_id}, media_strategy={body.media_strategy_skip_type}")

    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        logger.warning(f"[prepare_cluster] User not found: user_id={user_id}")
        return jsonify(error="No such user"), 401

    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        logger.error(f"[prepare_cluster] Scraper cluster not found: scraper_cluster_id={body.scraper_cluster_id}, user_id={user_id}")
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400

    if not scraper_cluster_entity.scraper_entity_id:
        logger.warning(f"[prepare_cluster] Scraper not initialized: scraper_cluster_id={body.scraper_cluster_id}")
        return jsonify(error="scraper is not yet initialized"), 409

    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        logger.warning(f"[prepare_cluster] Scraping not completed: scraper_cluster_id={body.scraper_cluster_id}, status={scraper_cluster_entity.stages.scraping}")
        return jsonify(error="scraper is not completed yet"), 409

    if scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        logger.info(f"[prepare_cluster] Cluster preparation already completed: scraper_cluster_id={body.scraper_cluster_id}")
        return jsonify(error="Cluster preparation is already completed"), 409

    scraper_entity = get_scraper_repository().find_by_id_and_user(user_id, scraper_cluster_entity.scraper_entity_id)
    if not scraper_entity:
        logger.error(f"[prepare_cluster] Scraper entity not found: scraper_entity_id={scraper_cluster_entity.scraper_entity_id}, user_id={user_id}")
        return jsonify(error=f"No scraper entity connected to scraper_cluster_entity = {scraper_cluster_entity.id}"), 400

    if scraper_entity.get_next_keyword():
        logger.warning(f"[prepare_cluster] Scraper has pending keywords: scraper_id={scraper_entity.id}, next_keyword={scraper_entity.get_next_keyword()}")
        return jsonify(error=f"The scraper is not yet done as there are still pending keywords for with scraper_id = {scraper_entity.id} (keyword = {scraper_entity.get_next_keyword()})"), 400

    logger.info(f"[prepare_cluster] Starting cluster preparation: scraper_cluster_id={body.scraper_cluster_id}")
    scraper_cluster_entity.stages.scraping = StatusType.Completed
    scraper_cluster_entity.stages.cluster_prep = StatusType.Ongoing

    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)

    cluster_units_created = ClusterPrepService.start_preparing_clustering(scraper_cluster_entity, body.media_strategy_skip_type)

    logger.info(f"[prepare_cluster] Cluster preparation completed: scraper_cluster_id={body.scraper_cluster_id}, units_created={cluster_units_created}")
    scraper_cluster_entity.stages.cluster_prep = StatusType.Completed

    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)

    return jsonify(message=f"preparing the cluster is successful, a total of {cluster_units_created} cluster units are created"), 200


@clustering_bp.route("/enrich_cluster_text", methods=["POST"])
@validate_request_body(ScraperClusterId)
@jwt_required()
def enrich_cluster_text(body: ScraperClusterId):
    user_id = get_jwt_identity()
    logger.info(f"[enrich_cluster_text] Request received for user_id={user_id}, scraper_cluster_id={body.scraper_cluster_id}")

    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        logger.warning(f"[enrich_cluster_text] User not found: user_id={user_id}")
        return jsonify(error="No such user"), 401

    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        logger.error(f"[enrich_cluster_text] Scraper cluster not found: scraper_cluster_id={body.scraper_cluster_id}, user_id={user_id}")
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400

    if not scraper_cluster_entity.scraper_entity_id:
        logger.warning(f"[enrich_cluster_text] Scraper not initialized: scraper_cluster_id={body.scraper_cluster_id}")
        return jsonify(error="scraper is not yet initialized"), 409

    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        logger.warning(f"[enrich_cluster_text] Scraping not completed: scraper_cluster_id={body.scraper_cluster_id}, status={scraper_cluster_entity.stages.scraping}")
        return jsonify(error="scraper is not completed yet"), 409

    if not scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        logger.warning(f"[enrich_cluster_text] Cluster preparation not completed: scraper_cluster_id={body.scraper_cluster_id}, status={scraper_cluster_entity.stages.cluster_prep}")
        return jsonify(error="Cluster preparation is not completed"), 409

    logger.info(f"[enrich_cluster_text] Starting cluster enrichment: scraper_cluster_id={body.scraper_cluster_id}")
    # :TODO Call the LLM for each comment
    ClusterPrepService.enrich_cluster_units(scraper_cluster_entity)
    logger.info(f"[enrich_cluster_text] Cluster enrichment completed: scraper_cluster_id={body.scraper_cluster_id}")


    
@clustering_bp.route("/get_cluster_units", methods=["GET"])
@validate_query_params(GetClusterUnitsRequest)
@jwt_required()
def get_cluster_units(query: GetClusterUnitsRequest):
    user_id = get_jwt_identity()
    logger.info(f"[get_cluster_units] Request received for user_id={user_id}, scraper_cluster_id={query.scraper_cluster_id}, message_type={query.reddit_message_type}")

    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        logger.warning(f"[get_cluster_units] User not found: user_id={user_id}")
        return jsonify(error="No such user"), 401

    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)

    if not scraper_cluster_entity:
        logger.error(f"[get_cluster_units] Scraper cluster not found: scraper_cluster_id={query.scraper_cluster_id}, user_id={user_id}")
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400

    if not scraper_cluster_entity.scraper_entity_id:
        logger.warning(f"[get_cluster_units] Scraper not initialized: scraper_cluster_id={query.scraper_cluster_id}")
        return jsonify(error="scraper is not yet initialized"), 409

    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        logger.warning(f"[get_cluster_units] Scraping not completed: scraper_cluster_id={query.scraper_cluster_id}, status={scraper_cluster_entity.stages.scraping}")
        return jsonify(error="scraper is not completed yet"), 409

    if not scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        logger.warning(f"[get_cluster_units] Cluster preparation not completed: scraper_cluster_id={query.scraper_cluster_id}, status={scraper_cluster_entity.stages.cluster_prep}")
        return jsonify(error="Cluster preparation is no completed"), 409

    logger.info(f"[get_cluster_units] Converting cluster units to documents: scraper_cluster_id={query.scraper_cluster_id}, message_type={query.reddit_message_type}")
    returnable_cluster_units = ClusterPrepService.convert_cluster_units_to_bertopic_ready_documents(scraper_cluster_entity, query.reddit_message_type)

    if returnable_cluster_units:
        logger.info(f"[get_cluster_units] Successfully retrieved {len(returnable_cluster_units)} cluster units: scraper_cluster_id={query.scraper_cluster_id}")
        return jsonify(returnable_cluster_units), 200
    else:
        logger.warning(f"[get_cluster_units] No cluster units found: scraper_cluster_id={query.scraper_cluster_id}")
        return jsonify(error="There are no cluster unit entities for the scraper cluster instance"), 400
    

@clustering_bp.route("/update_ground_truth", methods=["PUT"])
@validate_request_body(UpdateGroundTruthRequest)
@jwt_required()
def update_ground_truth(body: UpdateGroundTruthRequest):
    user_id = get_jwt_identity()
    logger.info(f"[update_ground_truth] Request received for user_id={user_id}, cluster_entity_id={body.cluster_unit_entity_id}, label_template_id={body.label_template_id}, category={body.ground_truth_category}")

    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        logger.warning(f"[update_ground_truth] User not found: user_id={user_id}")
        return jsonify(error="No such user"), 401

    cluster_unit_entity = get_cluster_unit_repository().find_by_id(body.cluster_unit_entity_id)

    if not cluster_unit_entity:
        logger.error(f"[update_ground_truth] Cluster unit not found: cluster_entity_id={body.cluster_unit_entity_id}")
        return jsonify(error=f"cluster_unit_entity doesn't exist id = {body.cluster_unit_entity_id}"), 400

    label_template_entity = get_label_template_repository().find_by_id(body.label_template_id)
    if not label_template_entity:
        logger.error(f"[update_ground_truth] Label template not found: label_template_id={body.label_template_id}")
        return jsonify(error=f"label_template_entity not found for id = {body.label_template_id}"), 400

    if not label_template_entity.is_ground_truth_value_part_of_label(label_name=body.ground_truth_category, label_value=body.ground_truth):
        logger.warning(f"[update_ground_truth] Invalid ground truth format: label_template_id={body.label_template_id}, category={body.ground_truth_category}, value={body.ground_truth}")
        return jsonify(error=f"wrong format of ground truth or category"), 400

    logger.info(f"[update_ground_truth] Updating ground truth: cluster_entity_id={body.cluster_unit_entity_id}, category={body.ground_truth_category}, value={body.ground_truth}")
    result = LabelTemplateService().update_ground_truth(cluster_unit_entity=cluster_unit_entity,
                                                        label_template_entity=label_template_entity,
                                                        ground_truth_label_name=body.ground_truth_category,
                                                        ground_truth_value=body.ground_truth)

    logger.info(f"[update_ground_truth] Ground truth updated successfully: cluster_entity_id={body.cluster_unit_entity_id}, modified_count={result.modified_count}")
    return jsonify(result=result.modified_count)


@clustering_bp.route("/update_ground_truth_per_label", methods=["PUT"])
@validate_request_body(UpdateGroundTruthPerLabelRequest)
@jwt_required()
def update_ground_truth_per_label(body: UpdateGroundTruthPerLabelRequest):
    """legacy update, will be deleted, the route in label_template_routes does this as well while also adding to label_template_entity"""
    user_id = get_jwt_identity()
    logger.info(f"[update_ground_truth_one_shot] Request received for user_id={user_id}, cluster_unit_enity_id={body.cluster_unit_entity_id} one_shot_example={body.ground_truth_one_shot_example}")

    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        logger.warning(f"[update_ground_truth] User not found: user_id={user_id}")
        return jsonify(error="No such user"), 401

    cluster_unit_entity = get_cluster_unit_repository().find_by_id(body.cluster_unit_entity_id)

    if not cluster_unit_entity:
        logger.error(f"[update_ground_truth] Cluster unit not found: cluster_entity_id={body.cluster_unit_entity_id}")
        return jsonify(error=f"cluster_unit_entity doesn't exist id = {body.cluster_unit_entity_id}"), 400

    label_template_entity = get_label_template_repository().find_by_id(body.label_template_id)
    if not label_template_entity:
        logger.error(f"[update_ground_truth] Label template not found: label_template_id={body.label_template_id}")
        return jsonify(error=f"label_template_entity not found for id = {body.label_template_id}"), 400

    logger.info(f"[update_ground_truth] Updating ground truth: cluster_entity_id={body.cluster_unit_entity_id}")

    # label_projection_one_shot = dict()
    # for label_name, projection in body.ground_truth_one_shot_example.items():
    cluster_unit_entity.ground_truth_one_shot_example = body.ground_truth_one_shot_example

    result = get_cluster_unit_repository().update(cluster_unit_entity.id, cluster_unit_entity)


    # result = get_cluster_unit_repository().update_ground_truth_category_per_label(cluster_unit_entity_id=cluster_unit_entity,
    #                                                                     label_template_id=label_template_entity.id,
    #                                                                     ground_truth_category=body.ground_truth_category,
    #                                                                     per_label_name=body.per_label_name,
    #                                                                     per_label_value=body.per_label_value)

    logger.info(f"[update_ground_truth] Ground truth updated successfully: cluster_entity_id={body.cluster_unit_entity_id}, modified_count={result.modified_count}")
    return jsonify(result=result.modified_count)
    