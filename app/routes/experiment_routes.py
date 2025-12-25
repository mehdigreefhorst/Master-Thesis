

import asyncio
from typing import List
from flask import Blueprint, Response, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
import random

from app.database import get_cluster_repository, get_cluster_unit_repository, get_experiment_repository, get_filtering_repository, get_label_template_repository, get_openrouter_data_repository, get_prompt_repository, get_sample_repository, get_scraper_cluster_repository, get_user_repository
from app.database.entities.experiment_entity import ExperimentEntity
from app.database.entities.prompt_entity import PromptCategory, PromptEntity
from app.database.entities.sample_entity import SampleEntity
from app.database.entities.scraper_cluster_entity import StageStatus
from app.requests.cluster_prep_requests import ScraperClusterId
from app.requests.experiment_requests import CreateExperiment, CreatePrompt, CreateSample, ExperimentId, GetExperiments, GetInputEntities, GetSample, GetSampleUnits, GetSampleUnitsLabelingFormat, ParsePrompt, ParseRawPrompt, TestPrediction, UpdateExperimentThreshold, UpdateSample
from app.responses.get_experiments_response import ClusterEntityInputCount, GetExperimentsResponse, InputEntitiesExperimentsResponse, PredictionsGroupedOutputFormat
from app.services.cluster_prep_service import ClusterPrepService
from app.services.experiment_service import ExperimentService
from app.services.label_template_service import LabelTemplateService
from app.utils.api_validation import validate_request_body, validate_query_params
from app.utils.llm_helper import LlmHelper
from app.utils.logging_config import get_logger
from app.utils.types import StatusType


logger = get_logger(__name__)


experiment_bp = Blueprint("experiment", __name__, url_prefix="/experiment")

@experiment_bp.route("/", methods=["GET"])
@validate_query_params(GetExperiments)
@jwt_required()
def get_experiment_instances(query: GetExperiments) -> List[GetExperimentsResponse]:
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
        
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)
    if query.user_threshold is not None and (query.user_threshold > 1 or query.user_threshold < 0):
        return jsonify(error=f"user_threshold must be between 0 and 1 | NOT {query.user_threshold}"), 400
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper is not yet initialized"), 409
    
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(error="scraper is not completed yet"), 409
    
    filter = {"scraper_cluster_id": query.scraper_cluster_id}
    if query.experiment_ids:
        filter.update({"_id": {"$in": query.experiment_ids}})

    if query.filter_experiment_type:
        filter["experiment_type"] = query.filter_experiment_type.value
    logger.info(f"filter = {filter}")
    # Debug logging
    logger.info(f"Filter being used: {filter}")
    logger.info(f"scraper_cluster_id: {query.scraper_cluster_id}")
    logger.info(f"experiment_ids: {query.experiment_ids}")

    experiment_entities = get_experiment_repository().find(filter)
    logger.info(f"Found {len(experiment_entities)} experiments")

    if not experiment_entities:
        # Try querying with just scraper_cluster_id to see if that works
        test_filter = {"scraper_cluster_id": query.scraper_cluster_id}
        test_results = get_experiment_repository().find(test_filter)
        logger.error(f"DEBUG: Found {len(test_results)} experiments with just scraper_cluster_id filter")
        if test_results:
            logger.error(f"DEBUG: First experiment ID: {test_results[0].id}")
            logger.error(f"DEBUG: Queried experiment_ids: {query.experiment_ids}")
        return jsonify(error=f"nothing found! Tried with filter: {filter}"), 400
    
    if not scraper_cluster_entity.sample_id:
        return jsonify(f"Scraper cluster entity: {scraper_cluster_entity.id} is missing a sample entity id")
    
    sample_entity = get_sample_repository().find_by_id(scraper_cluster_entity.sample_id)

    if not sample_entity:
        return jsonify(f"Scraper cluster entity: {scraper_cluster_entity.id} with sample_id: {scraper_cluster_entity.sample_id} is not findable")        

    returnable_instances = ExperimentService.convert_experiment_entities_for_user_interface(experiment_entities, sample_entity, query.user_threshold)
    return jsonify(returnable_instances), 200


@experiment_bp.route("/", methods=["PUT"])
@validate_request_body(UpdateExperimentThreshold)
@jwt_required()
def update_experiment_threshold(body: UpdateExperimentThreshold):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    experiment_entity = get_experiment_repository().find_by_id(body.experiment_id)

    if not experiment_entity:
        return jsonify(error=f"No experiment entity found for experiment id : {body.experiment_id}"), 404
    
    if body.threshold_runs_true > experiment_entity.runs_per_unit:
        return jsonify(error=f"threshold({body.threshold_runs_true}) is larger than runs per unit ({body.runs_per_unit}), impossible !"), 400
    
    
    updated = get_experiment_repository().update(experiment_entity.id, {"threshold_runs_true": body.threshold_runs_true}).acknowledged

    if updated:
        return jsonify(message="successfully updated the threshold"), 200


@experiment_bp.route("/", methods=["POST"])
@validate_request_body(CreateExperiment)
@jwt_required()
def create_experiment(body: CreateExperiment):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    if body.threshold_runs_true > body.runs_per_unit:
        return jsonify(error=f"threshold({body.threshold_runs_true}) is larger than runs per unit ({body.runs_per_unit}), impossible !"), 400
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {body.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper is not yet initialized"), 409
    
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(error="scraper is not completed yet"), 409
    
    if not scraper_cluster_entity.sample_id:
        return jsonify(error="You must create a sample entity first")
    
    prompt_entity = get_prompt_repository().find_by_id(body.prompt_id)

    if not prompt_entity:
        return jsonify(error=f"prompt entity is not found that was provided: {body.prompt_id}"), 400
    
    if not prompt_entity.created_by_user_id == user_id and not prompt_entity.public_policy:
        return jsonify(error="The provided prompt is not public and not created by you!"), 400
    
    label_template_entity = get_label_template_repository().find_by_id(body.label_template_id)
    if not label_template_entity:
        return jsonify(error=f"label_template_entity not found for id = {body.label_template_id}"), 400
    
    # if not prompt_entity.category == PromptCategory.Classify_cluster_units:
    #     return jsonify(error=f"Selected prompt {prompt_entity.id} is not of category 'Classify_cluster_units', it is {prompt_entity.category}"), 400
    
    if body.input_type == "sample":
        
        sample_entity = get_sample_repository().find_by_id(body.input_id)

        if not sample_entity:
            return jsonify(error=f"the provided input_id  does not exist sample_id: {body.input_id}"), 400
        
        if not sample_entity.sample_cluster_unit_ids:
            return jsonify(error=f"No cluster units have been assigned in the sample for us to do an experiment with | sample_id: {body.input_id}"), 400

        if not (sample_entity.sample_label_template_labeled_status.get(label_template_entity.id) == StatusType.Completed):
            return jsonify(error=f"Before experiment creation the Sample must be labeled first for this label template! "), 400
    elif body.input_type == "cluster":
        cluster_entity = get_cluster_repository().find_by_id(body.input_id)
        if not cluster_entity:
            return jsonify(error=f"cluster_entity with id = {body.input_id} does not exist"), 400
        
    elif body.input_type == "filtering":
        filtering_entity = get_filtering_repository().find_by_id(body.input_id)
        if not filtering_entity:
            return jsonify(error=f"No filtering entity with id = {body.input_id} is findable"), 400
    
    else:
        raise Exception(f"unknown input type is given! type = {body.input_type}")

    logger.info("body.model_id = ", body.model_id)
    model_pricing = get_openrouter_data_repository().find_pricing_of_model(model_id=body.model_id)

    experiment_entity = ExperimentEntity(user_id=user_id,
                                         scraper_cluster_id=scraper_cluster_entity.id,
                                         prompt_id=prompt_entity.id,
                                         input_id=body.input_id,
                                         input_type=body.input_type,
                                         experiment_type=prompt_entity.category,
                                         label_template_id= label_template_entity.id,
                                         model_id= body.model_id,
                                         model_pricing=model_pricing,
                                         runs_per_unit=body.runs_per_unit,
                                         threshold_runs_true=body.threshold_runs_true,
                                         reasoning_effort=body.reasoning_effort,
                                         status=StatusType.Initialized)

    if scraper_cluster_entity.stages.experiment == StatusType.Initialized:
        print("I am setting the status type to ongoing!")
        scraper_cluster_entity.stages.experiment = StatusType.Ongoing
        get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)

    inserted_result = get_experiment_repository().insert(experiment_entity)
    experiment_id = str(inserted_result.inserted_id)

    return jsonify(experiment_id=experiment_id, message=f"succesfully created experiment with id {experiment_id}"), 200


@experiment_bp.route("/continue_experiment", methods=["POST"])
@jwt_required()
@validate_query_params(ExperimentId)
def continue_experiment(query: ExperimentId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    experiment_entity = get_experiment_repository().find_by_id(query.experiment_id)

    if not experiment_entity:
        return jsonify(error=f"No experiment entity found for experiment id : {query.experiment_id}"), 404
    
    if experiment_entity.status == StatusType.Ongoing or experiment_entity.status == StatusType.Completed:
        return jsonify(error=f"The experiment is already {experiment_entity.status}, no ability to continue")
    label_template_entity = get_label_template_repository().find_by_id(experiment_entity.label_template_id)
    if not label_template_entity:
        return jsonify(error=f"label_template_entity not found for id = {experiment_entity.label_template_id}"), 400
    prompt_entity = get_prompt_repository().find_by_id(experiment_entity.prompt_id)

    if not prompt_entity:
        return jsonify(error=f"prompt entity is not found that was provided: {experiment_entity.prompt_id}"), 400
    
    if not prompt_entity.created_by_user_id == user_id and not prompt_entity.public_policy:
        return jsonify(error="The provided prompt is not public and not created by you!"), 400
    
    # if not prompt_entity.category == PromptCategory.Classify_cluster_units:
    #     return jsonify(error=f"Selected prompt {prompt_entity.id} is not of category 'Classify_cluster_units', it is {prompt_entity.category}"), 400
    
    ## Retrieve correct cluser units for experiment
    try:
        cluster_unit_entities = ExperimentService().get_input_cluster_unit_entities_from_expertiment(experiment_entity=experiment_entity)
    
    except Exception as e:
        return jsonify(error=str(e)), 400
    
    get_experiment_repository().update(experiment_entity.id, {"status": StatusType.Ongoing})
    experiment_entity.status = StatusType.Ongoing

    if not cluster_unit_entities:
        return jsonify(error=f"not all Cluster unit ids are found cannot be found for experiment {experiment_entity.id} for input_type = {experiment_entity.input_type} & input_id = {experiment_entity.input_id}"), 400

    try:

        # Reset rate limiter locks before entering new event loop
        from app.utils.rate_limiters import RateLimiterRegistry
        for limiter in RateLimiterRegistry._rate_limiters.values():
            limiter.reset_lock()

        total_cluster_unit_predicted_categories = asyncio.run(ExperimentService.predict_categories_cluster_units(
            experiment_entity=experiment_entity,
            label_template_entity=label_template_entity,
            cluster_unit_entities=cluster_unit_entities,
            prompt_entity=prompt_entity))

        
    except Exception as e:
        experiment_entity.status = StatusType.Error
        get_experiment_repository().update(experiment_entity.id, experiment_entity)
        raise 
        return jsonify(error=f"Error = {e}")
    return jsonify(f"succesfully predicted a total of {total_cluster_unit_predicted_categories} categories for units")


@experiment_bp.route("/", methods=["DELETE"])
@validate_query_params(ExperimentId)
@jwt_required()
def delete_experiment(query: ExperimentId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    experiment_entity = get_experiment_repository().find_by_id(query.experiment_id)
    if experiment_entity.status == StatusType.Initialized:
        modified_count = get_experiment_repository().delete(experiment_entity.id).modified_count
        return jsonify(message=f"Succesfully deleted {modified_count} experiments with id = {experiment_entity.id}"), 200

    else:
        return jsonify(error=f"experiment_id {experiment_entity.id} wrong statusType, must be Initialized -> NOT {experiment_entity.status}"), 400

@experiment_bp.route("/parse_prompt", methods=["POST"])
@validate_request_body(ParsePrompt)
@jwt_required()
def parse_prompt(body: ParsePrompt):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    prompt_entity = get_prompt_repository().find_by_id(body.prompt_id)

    if not prompt_entity:
        return jsonify(error=f"prompt entity is not found that was provided: {body.prompt_id}"), 400
    
    if not prompt_entity.created_by_user_id == user_id and not prompt_entity.public_policy:
        return jsonify(error="The provided prompt is not public and not created by you!"), 400
    
    # if not prompt_entity.category == PromptCategory.Classify_cluster_units:
    #     return jsonify(error=f"Selected prompt {prompt_entity.id} is not of category 'Classify_cluster_units', it is {prompt_entity.category}"), 400
    
    cluster_unit_entity = get_cluster_unit_repository().find_by_id(body.cluster_unit_id)

    if not cluster_unit_entity:
        return jsonify(error=f"cluster unit entity is not found id: {body.cluster_unit_id}"), 400
    
    label_template_entity = get_label_template_repository().find_by_id(body.label_template_id)
    if not label_template_entity:
        return jsonify(error=f"label_template_entity not found for id = {body.label_template_id}"), 400
    
    parsed_prompt = ExperimentService.parse_classification_prompt(cluster_unit_entity, prompt_entity, label_template_entity)

    return jsonify(parsed_prompt), 200


@experiment_bp.route("/parse_raw_prompt", methods=["POST"])
@validate_request_body(ParseRawPrompt)
@jwt_required()
def parse_raw_prompt(body: ParseRawPrompt):
    """parses the promt as is made in the user interface. without saving it to any other data entity"""
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    cluster_unit_entity = get_cluster_unit_repository().find_by_id(body.cluster_unit_id)

    if not cluster_unit_entity:
        return jsonify(error=f"cluster unit entity is not found id: {body.cluster_unit_id}"), 400
    
    label_template_entity = get_label_template_repository().find_by_id(body.label_template_id)
    if not label_template_entity:
        return jsonify(error=f"label_template_entity not found for id = {body.label_template_id}"), 400
    
    label_template_entity.ground_truth_field = label_template_entity._create_ground_truth_field()
    label_template_entity.labels_llm_prompt_response_format = label_template_entity.create_labels_llm_prompt_response_format_field()

    print("label_template_entity = ", label_template_entity.model_dump_json(indent=4))



    parsed_prompt = ExperimentService.parse_prompt_cluster_unit_entity(cluster_unit_entity=cluster_unit_entity, prompt=body.prompt, label_template_entity=label_template_entity)

    return jsonify(parsed_prompt), 200

@experiment_bp.route("/create_prompt", methods=["POST"])
@validate_request_body(CreatePrompt)
@jwt_required()
def create_prompt(body: CreatePrompt) -> PromptEntity:
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    prompt_entity = PromptEntity(name=body.name,
                                 created_by_user_id=user_id,
                                 public_policy=True,
                                 system_prompt=body.system_prompt,
                                 prompt=body.prompt,
                                 category=body.category)
    
    get_prompt_repository().insert(prompt_entity)
    return jsonify(prompt_entity.model_dump())


@experiment_bp.route("/get_prompts", methods=["GET"])
@jwt_required()
def get_prompts():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    prompt_entities = get_prompt_repository().find({})
    prompt_entities = [prompt_entity.model_dump() for prompt_entity in prompt_entities]
    return jsonify(prompt_entities)


@experiment_bp.route("/create_sample", methods=["POST"])
@validate_request_body(CreateSample)
@jwt_required()
def create_sample(body: CreateSample) -> SampleEntity:
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, body.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error="No such scraper_cluster_entity"), 401
    
    if not scraper_cluster_entity.cluster_entity_id:
        return jsonify(error="no cluster_entity_id available for the scraper_cluster_entity"), 401

    cluster_entity = get_cluster_repository().find_by_id(scraper_cluster_entity.cluster_entity_id)
    if not cluster_entity:
        return jsonify(error=f"There is no cluster entity found, id = {scraper_cluster_entity.cluster_entity_id}"), 400
    
    sample_cluster_unit_ids = ClusterPrepService().get_cluster_unit_ids_for_sample(picked_posts_cluster_unit_ids=body.picked_posts_cluster_unit_ids,
                                                                sample_size=body.sample_size,
                                                                cluster_entity=cluster_entity)
    if isinstance(sample_cluster_unit_ids, Response):
        return sample_cluster_unit_ids

    

    sample_entity = SampleEntity(user_id=user_id,
                                 picked_post_cluster_unit_ids=body.picked_posts_cluster_unit_ids,
                                 sample_size=body.sample_size,
                                 sample_cluster_unit_ids=sample_cluster_unit_ids
                                 )
    
    sample_id = get_sample_repository().insert(sample_entity).inserted_id
    get_scraper_cluster_repository().update(body.scraper_cluster_id, {"sample_id":sample_id})
    return jsonify(sample_entity.model_dump())


@experiment_bp.route("/get_sample_units", methods=["GET"])
@validate_query_params(GetSampleUnits)
@jwt_required()
def get_sample_units(query: GetSampleUnits):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)
    
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper is not yet initialized"), 409
    
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(error="scraper is not completed yet"), 409
    
    if not scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        return jsonify(error="Cluster preparation is no completed"), 409
    
    if not scraper_cluster_entity.sample_id:
        return jsonify(error="you must first create a sample entity"), 400
    
    sample_enity = get_sample_repository().find_by_id(scraper_cluster_entity.sample_id)

    if not sample_enity:
        return jsonify(error="the sample entity id that is associated cannot be found"), 400
    
    # if sample_enity.sample_labeled_status == StatusType.Initialized:
    #     get_sample_repository().update(sample_enity.id, {"sample_labeled_status": StatusType.Ongoing})

    logger.info(f"len(sample_enity.sample_cluster_unit_ids) = {len(sample_enity.sample_cluster_unit_ids)}")
    if not sample_enity.sample_label_template_labeled_status:
        return jsonify(error="add label_template_ids to sample first"), 400
    label_template_entities = get_label_template_repository().find_many_by_ids(sample_enity.get_label_template_ids())
    # for label_template_entity in label_template_entities:
    #     label_template_entity._create_ground_truth_field()
    #     get_label_template_repository().update(label_template_entity.id, label_template_entity)
    cluster_unit_entities = get_cluster_unit_repository().find_many_by_ids(sample_enity.sample_cluster_unit_ids)
    # if query.filter_experiment_type:
    #     experiment_ids = list({experiment_id for cluster_unit in cluster_unit_entities for experiment_id in cluster_unit.predicted_category.keys()})
    #     experiment_entities = get_experiment_repository().find_many_by_ids(experiment_ids)
    #     experiment_entities_to_remove = [experiment_entity for experiment_entity in experiment_entities if experiment_entity.experiment_type != query.filter_experiment_type]
    #     for experiment_entity in experiment_entities_to_remove:
    #         for cluster_unit in cluster_unit_entities:
    #             if experiment_entity.id in cluster_unit.predicted_category:
    #                 cluster_unit.predicted_category.pop(experiment_entity.id)
    cluster_unit_entities = ExperimentService().filter_cluster_units_predicted_experiments(cluster_unit_entities=cluster_unit_entities,
                                                                                           filter_label_template_id=query.filter_label_template_id,
                                                                                           filter_experiment_type= query.filter_experiment_type)
    
    cluster_unit_entities = ExperimentService().filter_cluster_units_ground_truth(cluster_unit_entities=cluster_unit_entities,
                                                                                  filter_label_template_id=query.filter_label_template_id)
    
    logger.info(f"len(cluster_unit_entities = ), {len(cluster_unit_entities)}")

    returnable_cluster_units = LabelTemplateService.convert_sample_cluster_units_return_format(cluster_unit_entities, label_template_entities)
    logger.info(f"len(returnable_cluster_units) = {len(returnable_cluster_units)}")

    found_cluster_unit_ids = [cluster_unit_id.id for cluster_unit_id in cluster_unit_entities]

    logger.info(f"units not in db but in sample: {[unit_id for unit_id in sample_enity.sample_cluster_unit_ids if unit_id not in found_cluster_unit_ids]}")
    if returnable_cluster_units:
        return jsonify(returnable_cluster_units), 200
    else:
        return jsonify(error="The sample does not contain real cluster unit entities for the scraper cluster instance"), 400


@experiment_bp.route("/get_sample_units_labeling_format", methods=["GET"])
@validate_query_params(GetSampleUnitsLabelingFormat)
@jwt_required()
def get_sample_units_labeling_format(query: GetSampleUnitsLabelingFormat):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)
    
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper is not yet initialized"), 409
    
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(error="scraper is not completed yet"), 409
    
    if not scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        return jsonify(error="Cluster preparation is no completed"), 409
    
    if not scraper_cluster_entity.sample_id:
        return jsonify(error="you must first create a sample entity"), 400
    
    sample_enity = get_sample_repository().find_by_id(scraper_cluster_entity.sample_id)

    if not sample_enity:
        return jsonify(error="the sample entity id that is associated cannot be found"), 400
    
    # if sample_enity.sample_labeled_status == StatusType.Initialized:
    #     get_sample_repository().update(sample_enity.id, {"sample_labeled_status": StatusType.Ongoing})

    logger.info(f"len(sample_enity.sample_cluster_unit_ids) = {len(sample_enity.sample_cluster_unit_ids)}")
    if not sample_enity.sample_label_template_labeled_status or query.filter_label_template_id not in sample_enity.sample_label_template_labeled_status:
        return jsonify(error=f"add label_template_ids to sample first {query.filter_label_template_id} not yet added to sample: {sample_enity.id}"), 400
    label_template_entity = get_label_template_repository().find_by_id(query.filter_label_template_id)

    cluster_unit_entities = get_cluster_unit_repository().find_many_by_ids(sample_enity.sample_cluster_unit_ids)

    cluster_unit_entities = ExperimentService().filter_cluster_units_predicted_experiments(cluster_unit_entities=cluster_unit_entities,
                                                                                           filter_label_template_id=query.filter_label_template_id)
    
    cluster_unit_entities = ExperimentService().filter_cluster_units_ground_truth(cluster_unit_entities=cluster_unit_entities,
                                                                                  filter_label_template_id=query.filter_label_template_id)
    
    logger.info(f"len(cluster_unit_entities = ), {len(cluster_unit_entities)}")

    get_sample_unit_return_format = LabelTemplateService.convert_sample_cluster_units_return_format_labeling_format(cluster_unit_entities, label_template_entity)
    logger.info(f"len(returnable_cluster_units) = {len(get_sample_unit_return_format.experiment_unit_data)}")

    found_cluster_unit_ids = [cluster_unit_id.id for cluster_unit_id in cluster_unit_entities]

    logger.info(f"units not in db but in sample: {[unit_id for unit_id in sample_enity.sample_cluster_unit_ids if unit_id not in found_cluster_unit_ids]}")
    if get_sample_unit_return_format:
        return jsonify(get_sample_unit_return_format.model_dump()), 200
    else:
        return jsonify(error="The sample does not contain real cluster unit entities for the scraper cluster instance"), 400


@experiment_bp.route("/sample", methods=["GET"])
@validate_query_params(GetSample)
@jwt_required()
def get_sample(query: GetSample) -> List[SampleEntity]:
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper is not yet initialized"), 409
    
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(error="scraper is not completed yet"), 409

    if not scraper_cluster_entity.sample_id:
        return jsonify(f"Scraper cluster entity: {scraper_cluster_entity.id} is missing a sample entity id")
    
    sample_entity = get_sample_repository().find_by_id(scraper_cluster_entity.sample_id)

    if not sample_entity:
        return jsonify(f"Scraper cluster entity: {scraper_cluster_entity.id} with sample_id: {scraper_cluster_entity.sample_id} is not findable")        

    return jsonify(sample_entity.model_dump()), 200


@experiment_bp.route("/complete_sample_labeled_status", methods=["PUT"])
@validate_query_params(UpdateSample)
@jwt_required()
def complete_sample_labeled_status(query: UpdateSample):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400
    
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(error="scraper is not yet initialized"), 409
    
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(error="scraper is not completed yet"), 409

    if not scraper_cluster_entity.sample_id:
        return jsonify(f"Scraper cluster entity: {scraper_cluster_entity.id} is missing a sample entity id")
    
    sample_entity = get_sample_repository().find_by_id(scraper_cluster_entity.sample_id)

    if not sample_entity:
        return jsonify(f"Scraper cluster entity: {scraper_cluster_entity.id} with sample_id: {scraper_cluster_entity.sample_id} is not findable")

    label_template_entity = get_label_template_repository().find_by_id(query.label_template_id)
    if not label_template_entity:
        return jsonify(error=f"label_template_entity not found for id = {query.label_template_id}"), 400
    # Set all None ground truth values to False for all cluster units in the sample
    # set the status sample to done
    sample_entity.set_sample_labeled_status(label_template_id=query.label_template_id, new_status=StatusType.Completed)
    updated_count = get_cluster_unit_repository().set_none_ground_truths_to_false(
        cluster_unit_ids=sample_entity.sample_cluster_unit_ids,
        label_template_id=query.label_template_id,
        labels_default_values=label_template_entity.get_labels_default_values()
    )
    logger.info(f"Set None ground truths to False for {updated_count} cluster units in sample {sample_entity.id}")

    get_sample_repository().update(sample_entity.id, sample_entity)

    return jsonify(message="OK"), 200


@experiment_bp.route("/test/prediction", methods=["POST"])
@validate_request_body(TestPrediction)
@jwt_required()
async def test_prediction(body: TestPrediction) -> PredictionsGroupedOutputFormat:
    print("body = ", body)
    print("body.experiment_id = ",body.experiment_id)
    experiment_entity = get_experiment_repository().find_by_id(body.experiment_id)

    if not experiment_entity:
        return jsonify(error=f"No experiment entity found for experiment id : {body.experiment_id}"), 404
    print(experiment_entity.model_dump())
    prompt_entity = get_prompt_repository().find_by_id(experiment_entity.prompt_id)
    label_template_entity = get_label_template_repository().find_by_id(experiment_entity.label_template_id)

    if not body.cluster_unit_ids:
        ## Retrieve correct cluser units for experiment
        try:
            cluster_unit_entities = ExperimentService().get_input_cluster_unit_entities_from_expertiment(experiment_entity=experiment_entity)
        except Exception as e:
            return jsonify(error=str(e)), 400
        # we just take the first body.nr_to_predict sample units from the sample entity, as it is stored sample.sample_cluster_unit_ids
        cluster_unit_entities_remain = cluster_unit_entities[:body.nr_to_predict]
    else:
        
        cluster_unit_entities_remain = get_cluster_unit_repository().find_many_by_ids(body.cluster_unit_ids)

    max_concurrent = 100
    test_predictions = await ExperimentService.test_predictions(
        experiment_entity=experiment_entity,
                label_template_entity=label_template_entity,
                prompt_entity=prompt_entity,
                cluster_unit_enities=cluster_unit_entities_remain, 
    )

    return jsonify(predictions=test_predictions)


@experiment_bp.route("/get_input_entities", methods=["GET"])
@validate_query_params(GetInputEntities)
@jwt_required()
def get_input_entities(query: GetInputEntities) -> InputEntitiesExperimentsResponse:
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, query.scraper_cluster_id)

    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {query.scraper_cluster_id}"), 400
    
    filtering_entities = get_filtering_repository().find({"scraper_cluster_id": scraper_cluster_entity.id})

    sample_entity = get_sample_repository().find_by_id(scraper_cluster_entity.sample_id)
    
    response_get_input_entities = InputEntitiesExperimentsResponse(filtering_entities=filtering_entities,
                                                                   sample_entity=[sample_entity])
    if not query.sample_only:
        cluster_entity = get_cluster_repository().find_by_id(scraper_cluster_entity.cluster_entity_id)
        cluster_units_cluster_entity = get_cluster_unit_repository().find_ids({"cluster_entity_id": cluster_entity.id})
        response_get_input_entities.insert_cluster_entity_unit_count(cluster_entity=cluster_entity,
                                                                     count_cluster_units=len(cluster_units_cluster_entity))
    
    return jsonify(response_get_input_entities.model_dump()), 200