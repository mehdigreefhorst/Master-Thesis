

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
import random

from app.database import get_cluster_unit_repository, get_experiment_repository, get_prompt_repository, get_sample_repository, get_scraper_cluster_repository, get_user_repository
from app.database.entities.experiment_entity import ExperimentEntity
from app.database.entities.prompt_entity import PromptCategory, PromptEntity
from app.database.entities.sample_entity import SampleEntity
from app.requests.cluster_prep_requests import ScraperClusterId
from app.requests.experiment_requests import CreateExperiment, CreatePrompt, CreateSample, GetExperiments, GetSampleUnits, ParsePrompt, ParseRawPrompt
from app.responses.get_experiments_response import GetExperimentsResponse
from app.services.experiment_service import ExperimentService
from app.utils.api_validation import validate_request_body, validate_query_params
from app.utils.llm_helper import LlmHelper
from app.utils.types import StatusType


experiment_bp = Blueprint("experiment", __name__, url_prefix="/experiment")

@experiment_bp.route("/", methods=["GET"])
@validate_query_params(GetExperiments)
@jwt_required()
def get_experiment_instances(query: GetExperiments) -> GetExperimentsResponse:
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
    
    filter = {"scraper_cluster_id": query.scraper_cluster_id}
    if query.experiment_id:
        filter.update({"_id": query.experiment_id})
        
    experiment_entities = get_experiment_repository().find(filter)

    

    returnable_instances = ExperimentService.convert_experiment_entities_for_user_interface(experiment_entities)
    return jsonify(returnable_instances), 200


@experiment_bp.route("/", methods=["POST"])
@validate_request_body(CreateExperiment)
@jwt_required()
def create_experiment(body: CreateExperiment):
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
    
    if not scraper_cluster_entity.sample_entity_id:
        return jsonify(message="You must create a sample entity first")
    
    prompt_entity = get_prompt_repository().find_by_id(body.prompt_id)

    if not prompt_entity:
        return jsonify(message=f"prompt entity is not found that was provided: {body.prompt_id}"), 400
    
    if not prompt_entity.created_by_user_id == user_id and not prompt_entity.public_policy:
        return jsonify(message="The provided prompt is not public and not created by you!"), 400
    
    if not prompt_entity.category == PromptCategory.Classify_cluster_units:
        return jsonify(message=f"Selected prompt {prompt_entity.id} is not of category 'Classify_cluster_units', it is {prompt_entity.category}")
    
    sample_entity = get_sample_repository().find_by_id(scraper_cluster_entity.sample_entity_id)

    if not sample_entity:
        return jsonify(message=f"the provided sample of the scraper cluster instance does not exist| sample_id: {scraper_cluster_entity.sample_entity_id}"), 400
    
    if not sample_entity.sample_cluster_unit_ids:
        return jsonify(message=f"No cluster units have been assigned in the sample for us to do an experiment with | sample_id: {scraper_cluster_entity.sample_entity_id}"), 400

    experiment_entity = ExperimentEntity(user_id=user_id,
                                         scraper_cluster_id=scraper_cluster_entity.id,
                                         prompt_id=prompt_entity.id,
                                         sample_id=sample_entity.id,
                                         model= body.model,
                                         runs_per_unit=body.runs_per_unit,
                                         reasoning_effort=body.reasoning_effort)
    
    get_experiment_repository().insert(experiment_entity)

    cluster_unit_entities = get_cluster_unit_repository().find_many_by_ids(sample_entity.sample_cluster_unit_ids)

    if not cluster_unit_entities or not len(cluster_unit_entities) == len(sample_entity.sample_cluster_unit_ids):
        return jsonify(message=f"not all Cluster unit ids are found cannot be found for sample: {sample_entity.id}")
    
    total_cluster_unit_predicted_categories = ExperimentService.predict_categories_cluster_units(experiment_entity=experiment_entity,
                                                       cluster_unit_entities=cluster_unit_entities,
                                                       prompt_entity=prompt_entity)
    return jsonify("succesfully processed the ")


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
        return jsonify(message=f"prompt entity is not found that was provided: {body.prompt_id}"), 400
    
    if not prompt_entity.created_by_user_id == user_id and not prompt_entity.public_policy:
        return jsonify(message="The provided prompt is not public and not created by you!"), 400
    
    if not prompt_entity.category == PromptCategory.Classify_cluster_units:
        return jsonify(message=f"Selected prompt {prompt_entity.id} is not of category 'Classify_cluster_units', it is {prompt_entity.category}")
    
    cluster_unit_entity = get_cluster_unit_repository().find_by_id(body.cluster_unit_id)

    if not cluster_unit_entity:
        return jsonify(message=f"cluster unit entity is not found id: {body.cluster_unit_id}"), 400
    
    parsed_prompt = ExperimentService.parse_classification_prompt(cluster_unit_entity, prompt_entity)

    return jsonify(parsed_prompt), 200


@experiment_bp.route("/parse_raw_prompt", methods=["POST"])
@validate_request_body(ParseRawPrompt)
@jwt_required()
def parse_raw_prompt(body: ParseRawPrompt):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    cluster_unit_entity = get_cluster_unit_repository().find_by_id(body.cluster_unit_id)

    if not cluster_unit_entity:
        return jsonify(message=f"cluster unit entity is not found id: {body.cluster_unit_id}"), 400
    
    parsed_prompt = LlmHelper.custom_formatting(
            prompt=body.prompt,
            conversation_thread=str(cluster_unit_entity.thread_path_text),
            final_reddit_message=cluster_unit_entity.text)

    return jsonify(parsed_prompt), 200

@experiment_bp.route("/create_prompt", methods=["POST"])
@validate_request_body(CreatePrompt)
@jwt_required()
def create_prompt(body: CreatePrompt) -> PromptEntity:
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    prompt_entity = PromptEntity(created_by_user_id=user_id,
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
    

    selected_cluster_units = get_cluster_unit_repository().find_many_by_ids(body.picked_posts_cluster_unit_ids)
    selected_cluster_unit_post_ids = [cluster_unit.post_id for cluster_unit in selected_cluster_units]
    cluster_unit_ids_with_corresponding_post_id = get_cluster_unit_repository().find_ids({"post_id": {"$in": selected_cluster_unit_post_ids}})
    if len(cluster_unit_ids_with_corresponding_post_id) < body.sample_size:
        return jsonify(error=f"Not enough cluster units. Found {len(cluster_unit_ids_with_corresponding_post_id)} but need {body.sample_size}"), 400
    
    sample_cluster_unit_ids = random.sample(cluster_unit_ids_with_corresponding_post_id, body.sample_size)
    # randomly select body.sample_size cluster units from here. 
    

    sample_entity = SampleEntity(user_id=user_id,
                                 picked_post_cluster_unit_ids=body.picked_posts_cluster_unit_ids,
                                 sample_size=body.sample_size,
                                 sample_cluster_unit_ids=sample_cluster_unit_ids
                                 )
    
    sample_entity_id = get_sample_repository().insert(sample_entity).inserted_id
    get_scraper_cluster_repository().update(body.scraper_cluster_id, {"sample_entity_id":sample_entity_id})
    return jsonify(sample_entity.model_dump())


@experiment_bp.route("/get_cluster_units", methods=["GET"])
@validate_query_params(GetSampleUnits)
@jwt_required()
def get_cluster_units(query: GetSampleUnits):
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
    
    if not scraper_cluster_entity.sample_entity_id:
        return jsonify(message="you must first create a sample entity"), 400
    
    sample_enity = get_sample_repository().find_by_id(scraper_cluster_entity.sample_entity_id)

    if not sample_enity:
        return jsonify(message="the sample entity id that is associated cannot be found"), 400
    
    cluster_unit_entities = get_cluster_unit_repository().find_many_by_ids(sample_enity.sample_cluster_unit_ids)
    returnable_cluster_units = [cluster_unit_entity.model_dump() for cluster_unit_entity in cluster_unit_entities]
    print("a total of units = ", len(returnable_cluster_units))
    if returnable_cluster_units:
        return jsonify(returnable_cluster_units), 200
    else:
        return jsonify(error="The sample does not contain real cluster unit entities for the scraper cluster instance"), 400

