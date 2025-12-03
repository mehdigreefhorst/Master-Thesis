

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.database import label_template_repository
from app.utils.api_validation import validate_query_params, validate_request_body
from app.requests.label_template_requests import CreateLabelTemplateRequest, GetLabelTemplateRequest
from app.database.entities.label_template import LabelTemplateEntity

label_template_bp = Blueprint("label_template", __name__, url_prefix="/label_template")


@label_template_bp.route("/", methods=["POST"])
@validate_request_body(CreateLabelTemplateRequest)
@jwt_required()
def create_label_template(body: CreateLabelTemplateRequest):
    user_id = get_jwt_identity()

    label_template_entity = LabelTemplateEntity(user_id=user_id,
                                              category_name=body.category_name,
                                              category_description=body.category_description,
                                              is_public=body.is_public,
                                              labels=body.labels,
                                              llm_prediction_fields_per_label=body.llm_prediction_fields_per_label,
                                              multi_label_possible=body.multi_label_possible)
    
    label_template_repository().insert(label_template_entity)

    return jsonify(created_label_template_id=label_template_entity.id)


@label_template_bp.route("/", methods=["GET"])
@validate_query_params(GetLabelTemplateRequest)
@jwt_required()
def get_label_template(query: GetLabelTemplateRequest):
    user_id = get_jwt_identity()

    if query.label_template_id:
        label_template_entity = label_template_repository().find_by_id(query.label_template_id)
        if label_template_entity:
            return jsonify(label_template_entities=[label_template_entity.model_dump()]), 200

    label_template_entities = label_template_repository().find_available_label_template_for_user(user_id)
    
    if label_template_entities:
        return jsonify(label_template_entities=[label_template_entity.model_dump() for label_template_entity in label_template_entities]), 200
    
    return jsonify(label_template_entities=[]), 200

    
