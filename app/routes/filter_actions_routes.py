"""
Routes for performing actions on filtered cluster units
"""

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import (
    get_cluster_unit_repository,
    get_user_repository,
    get_scraper_cluster_repository
)
from app.requests.filter_requests import (
    ExtractStandaloneStatementsRequest,
    LLMClusteringRequest
)
from app.services.filter_actions_service import FilterActionsService
from app.utils.api_validation import validate_request_body

filter_actions_bp = Blueprint("filter_actions", __name__, url_prefix="/filter_actions")


@filter_actions_bp.route("/extract_statements", methods=["POST"])
@validate_request_body(ExtractStandaloneStatementsRequest)
@jwt_required()
def extract_standalone_statements(body: ExtractStandaloneStatementsRequest):
    """
    Extract standalone statements from cluster units and optionally cluster with BERTopic
    """
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401

    # Verify user has access to this scraper cluster
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(
        user_id, body.scraper_cluster_id
    )
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find scraper_cluster_id={body.scraper_cluster_id}"), 400

    # Fetch the cluster units
    cluster_units = []
    for unit_id in body.cluster_unit_ids:
        unit = get_cluster_unit_repository().find_by_id(unit_id)
        if unit and unit.cluster_entity_id == scraper_cluster_entity.id:
            cluster_units.append(unit)

    if not cluster_units:
        return jsonify(error="No valid cluster units found"), 400

    # Extract statements
    statements = FilterActionsService.extract_standalone_statements(
        cluster_units,
        body.statement_type
    )

    if not statements:
        return jsonify(
            success=False,
            message="No statements extracted. Make sure units have appropriate ground truth labels.",
            num_statements=0
        ), 200

    # Cluster with BERTopic if requested
    if body.cluster_method == "bertopic":
        clustering_result = FilterActionsService.cluster_with_bertopic(
            statements,
            body.min_topic_size or 5,
            body.nr_topics or "auto"
        )

        if not clustering_result["success"]:
            return jsonify(clustering_result), 400

        return jsonify({
            "success": True,
            "method": "bertopic",
            "num_statements": len(statements),
            "num_topics": clustering_result["num_topics"],
            "num_outliers": clustering_result["num_outliers"],
            "statements": clustering_result["statements"],
            "topic_info": clustering_result["topic_info"]
        }), 200

    # Return just the statements without clustering
    return jsonify({
        "success": True,
        "method": "extraction_only",
        "num_statements": len(statements),
        "statements": statements
    }), 200


@filter_actions_bp.route("/llm_clustering", methods=["POST"])
@validate_request_body(LLMClusteringRequest)
@jwt_required()
def llm_category_clustering(body: LLMClusteringRequest):
    """
    Cluster units based on LLM predicted categories or semantic similarity
    """
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401

    # Verify user has access to this scraper cluster
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(
        user_id, body.scraper_cluster_id
    )
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find scraper_cluster_id={body.scraper_cluster_id}"), 400

    # Fetch the cluster units
    cluster_units = []
    for unit_id in body.cluster_unit_ids:
        unit = get_cluster_unit_repository().find_by_id(unit_id)
        if unit and unit.cluster_entity_id == scraper_cluster_entity.id:
            cluster_units.append(unit)

    if not cluster_units:
        return jsonify(error="No valid cluster units found"), 400

    # Choose clustering approach
    if body.clustering_approach == "category_based":
        # Cluster by predicted categories
        result = FilterActionsService.cluster_by_llm_categories(
            cluster_units,
            body.scraper_cluster_id,  # Using scraper_cluster_id as experiment_id for now
            body.categories_to_cluster
        )

        if not result["success"]:
            return jsonify(result), 400

        return jsonify({
            "success": True,
            "approach": "category_based",
            "category_clusters": result["category_clusters"],
            "category_counts": result["category_counts"],
            "total_units": result["total_units"],
            "units_with_predictions": result["units_with_predictions"],
            "units_without_predictions": len(result["units_without_predictions"])
        }), 200

    elif body.clustering_approach == "semantic_similarity":
        # Cluster by semantic similarity
        result = FilterActionsService.cluster_by_semantic_similarity(
            cluster_units,
            min_cluster_size=5
        )

        if not result["success"]:
            return jsonify(result), 400

        return jsonify({
            "success": True,
            "approach": "semantic_similarity",
            "num_clusters": result["num_clusters"],
            "num_outliers": result["num_outliers"],
            "total_units": result["total_units"],
            "clusters": result["clusters"]
        }), 200

    return jsonify(error="Invalid clustering approach"), 400
