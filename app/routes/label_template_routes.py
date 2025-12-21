

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import get_cluster_unit_repository, get_label_template_repository, get_sample_repository, get_user_repository
from app.utils.api_validation import validate_query_params, validate_request_body
from app.requests.label_template_requests import AddLabelTemplateToSampleRequest, UpdateCombinedLabels, CreateLabelTemplateRequest, GetLabelTemplateRequest, UpdateOneShotExampleRequest
from app.database.entities.label_template import LabelTemplateEntity
from app.utils.logging_config import get_logger

label_template_bp = Blueprint("label_template", __name__, url_prefix="/label_template")

logger = get_logger(__name__)

@label_template_bp.route("/", methods=["POST"])
@validate_request_body(CreateLabelTemplateRequest)
@jwt_required()
def create_label_template(body: CreateLabelTemplateRequest):
    user_id = get_jwt_identity()

    label_template_entity = LabelTemplateEntity(user_id=user_id,
                                              label_template_name=body.label_template_name,
                                              label_template_description=body.label_template_description,
                                              is_public=body.is_public,
                                              labels=body.labels,
                                              llm_prediction_fields_per_label=body.llm_prediction_fields_per_label,
                                              multi_label_possible=body.multi_label_possible)
    
    get_label_template_repository().insert(label_template_entity)

    return jsonify(created_label_template_id=label_template_entity.id)


@label_template_bp.route("/", methods=["GET"])
@validate_query_params(GetLabelTemplateRequest)
@jwt_required()
def get_label_template(query: GetLabelTemplateRequest):
    user_id = get_jwt_identity()

    if query.label_template_id:
        label_template_entity = get_label_template_repository().find_by_id(query.label_template_id)
        if label_template_entity:
            return jsonify(label_template_entities=[label_template_entity.model_dump()]), 200

    label_template_entities = get_label_template_repository().find_available_label_template_for_user(user_id)
    
    if label_template_entities:
        return jsonify(label_template_entities=[label_template_entity.model_dump() for label_template_entity in label_template_entities]), 200
    
    return jsonify(label_template_entities=[]), 200

    
@label_template_bp.route("/add_to_sample", methods=["PUT"])
@validate_request_body(AddLabelTemplateToSampleRequest)
@jwt_required()
def add_to_sample(body: AddLabelTemplateToSampleRequest):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        logger.warning(f"[update_ground_truth] User not found: user_id={user_id}")
        return jsonify(error="No such user"), 401
    
    label_template_entity = get_label_template_repository().find_by_id(body.label_template_id)
    if not label_template_entity:
        return jsonify(error=f"label_template_entity does not exist id = {body.label_template_id}")

    sample_entity = get_sample_repository().find_by_id(body.sample_entity_id)

    if not sample_entity:
        return jsonify(f"sample_id: {body.sample_entity_id} is not findable")     

    if body.label_template_id in sample_entity.label_template_ids:
        if body.action == "remove":
            sample_entity.label_template_ids = [label_template_id for label_template_id in sample_entity.label_template_ids if body.label_template_id != label_template_id]
    else:
        if body.action == "add":
            sample_entity.label_template_ids.append(body.label_template_id)
    
    get_sample_repository().update(sample_entity.id, sample_entity)

    return jsonify(sample_entity.model_dump()), 200



@label_template_bp.route("/update_one_shot_example", methods=["PUT"])
@validate_request_body(UpdateOneShotExampleRequest)
@jwt_required()
def update_one_shot_example(body: UpdateOneShotExampleRequest):
    user_id = get_jwt_identity()
    logger.info(f"[update_ground_truth_one_shot] Request received for user_id={user_id}, one_shot_example={body.ground_truth_one_shot_example}")

    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        logger.warning(f"[update_ground_truth] User not found: user_id={user_id}")
        return jsonify(error="No such user"), 401

    label_template_entity = get_label_template_repository().find_by_id(body.label_template_id)

    if not label_template_entity:
        return jsonify(error=f"label_template_entity does not exist id = {body.label_template_id}")
    
    label_template_entity.ground_truth_one_shot_example = body.ground_truth_one_shot_example

    result = get_label_template_repository().update(body.label_template_id, label_template_entity)
    logger.info(f"[one_shot_example] Oneshot example updated successfully, modified_count={result.modified_count}")
    return jsonify(result=result.modified_count)


@label_template_bp.route("/update_combined_labels", methods=["PUT"])
@validate_request_body(UpdateCombinedLabels)
@jwt_required()
def update_combined_labels(body: UpdateCombinedLabels):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        logger.warning(f"[update_ground_truth] User not found: user_id={user_id}")
        return jsonify(error="No such user"), 401
    
    label_template_entity = get_label_template_repository().find_by_id(body.label_template_id)

    if not label_template_entity:
        return jsonify(error=f"label_template_entity does not exist id = {body.label_template_id}")
    
    # Check if the combined labels even exist in the label template as labels
    all_possible_labels = {label: False for combined_labels in body.combined_labels for label in combined_labels}
    for label in label_template_entity.labels:
        if label.label in all_possible_labels:
            all_possible_labels[label.label] = True

    if [label for label, value in all_possible_labels.items() if value]:
        return jsonify(error="Not all labels of the combined labels even exist in the label_template")
    
    label_template_entity.combined_labels = body.combined_labels
    get_label_template_repository().update(label_template_entity.id, {"combined_labels": body.combined_labels})
    return jsonify(label_template_entity.model_dump()), 200