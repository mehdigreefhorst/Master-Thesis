# Experiment_service
import sys

from app.database.entities.base_entity import PyObjectId
from app.services.label_template_service import LabelTemplateService
sys.path.append("../..")

import asyncio
import json
from typing import Dict, List, Optional
from collections import defaultdict
import math

from pydantic import BaseModel
from app.database.entities.cluster_unit_entity import ClusterUnitPredictionCounter, ClusterUnitEntityPredictedCategory, PredictionCategoryTokens, ClusterUnitEntity, ClusterUnitEntityCategory, TokenUsageAttempt
from app.database import get_cluster_repository, get_cluster_unit_repository, get_experiment_repository, get_filtering_repository, get_sample_repository
from app.database.entities.experiment_entity import ExperimentEntity, LabelName, PredictionResult, PrevelanceUnitDistribution, ValueCount
from app.database.entities.label_template import LabelTemplateEntity
from app.database.entities.prompt_entity import PromptCategory, PromptEntity
from app.database.entities.sample_entity import SampleEntity
from app.database.entities.user_entity import UserEntity
from app.responses.get_experiments_response import ConfusionMatrix, GetExperimentsResponse, PredictionMetric, SinglePredictionOutputFormat, PredictionsGroupedOutputFormat
from app.services.llm_service import LLMService
from app.utils.llm_helper import LlmHelper
from app.utils.types import StatusType


from app.utils.logging_config import get_logger

# Initialize logger for this module
logger = get_logger(__name__)
class ExperimentService:
    """This class is all about creating experiments with a limited amount of cluster units. sending them to an LLM with the respective prompt"""


    @staticmethod
    async def predict_categories_cluster_units(
        experiment_entity: ExperimentEntity,
        label_template_entity: LabelTemplateEntity,
        cluster_unit_entities: List[ClusterUnitEntity], 
        prompt_entity: PromptEntity, 
        max_concurrent: int=1000):
        """this function orchestrates the prediction of the cluster unit entity and propagates it into the experiement entity"""
        # if not prompt_entity.category == PromptCategory.Classify_cluster_units:
        #     raise Exception("The prompt is of the wrong type!!!")
        # First we filter the cluster units that we have not yet predicted the category for. Might happen if we have predicted a part of clusterunits
        cluster_unit_entities_remain = [cluster_unit_entity for cluster_unit_entity in cluster_unit_entities if not (cluster_unit_entity.predicted_category and cluster_unit_entity.predicted_category.get(experiment_entity.id))]
        cluster_unit_entities_done = [cluster_unit_entity for cluster_unit_entity in cluster_unit_entities if (cluster_unit_entity.predicted_category and cluster_unit_entity.predicted_category.get(experiment_entity.id))]
        # If all cluster units are already predicted. We should stop the function early
        
        logger.info(f"Starting prediction for {len(cluster_unit_entities_remain)} units, "
                   f"{experiment_entity.runs_per_unit} runs each")
        
        logger.info(f"We skip {len(cluster_unit_entities_done)} cluster units because they are already completed earlier")
        
        # If there are cluster units left to be predicted, we do that here. And then we add updated cluster units to the cluster_unit_entities_done list
        if cluster_unit_entities_remain:
            predictions_grouped_output_format_object = await ExperimentService.create_predicted_categories(
                experiment_entity=experiment_entity,
                label_template_entity=label_template_entity,
                prompt_entity=prompt_entity,
                cluster_unit_enities=cluster_unit_entities_remain, 
                max_concurrent=max_concurrent)

            cluster_unit_entities_successfully_done = ExperimentService.update_add_to_db_cluster_unit_predictions(
                predictions_grouped_output_format_object=predictions_grouped_output_format_object,
                experiment_entity=experiment_entity)
            # If there were any cluster unit entities remaining & there was at least a single failure of prediction. We set experiment status to error
            success_count, failed_count = predictions_grouped_output_format_object.get_count_successful_failure_predictions()
        
            cluster_unit_entities_done.extend(cluster_unit_entities_successfully_done)
        if experiment_entity.experiment_type == PromptCategory.Classify_cluster_units and LabelTemplateService().cluster_unit_entities_done_labeling_ground_truth(cluster_unit_entities=cluster_unit_entities_done,
                                                                                                                                                                  label_template_entity=label_template_entity):
            ExperimentService.convert_total_predicted_into_aggregate_results(cluster_unit_entities_done, experiment_entity, label_template_entity=label_template_entity)

        # Calculate and store aggregate token statistics
        ExperimentService.calculate_and_store_token_statistics(cluster_unit_entities_done, experiment_entity)
       
        
        if len(cluster_unit_entities_remain) > 0 and failed_count > 0:
            logger.error(f"THere is an error we have {failed_count} predictions")
            ExperimentService.calculate_and_store_wasted_token_statistics(predictions_grouped_output_format_object=predictions_grouped_output_format_object, experiment_entity=experiment_entity)
            experiment_entity.status = StatusType.Error
        else:
            experiment_entity.status = StatusType.Completed
        get_experiment_repository().update(experiment_entity.id, experiment_entity)
    

    @staticmethod
    async def create_predicted_categories(
        experiment_entity: ExperimentEntity,
        label_template_entity: LabelTemplateEntity,
        prompt_entity: PromptEntity,
        cluster_unit_enities: List[ClusterUnitEntity],
        max_concurrent=1000,
        max_retries=3,
        max_retry_attempts_rate_limter: int = 5) -> PredictionsGroupedOutputFormat:
        
         # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(max_concurrent)
        open_router_api_key = LLMService.get_user_open_router_api_key(user_id=experiment_entity.user_id)
        if not open_router_api_key:
            raise Exception("No API key has been set by the user")

        async def predict_single_with_semaphore_and_retry(cluster_unit_entity, run_index) -> SinglePredictionOutputFormat:
            """
            Wrapper that ensures we don't have too many concurrent connections.
            The rate limiter (in LlmHelper) ensures we don't exceed API limits.
            Includes retry logic with exponential backoff and comprehensive token tracking.
            """
            all_attempts_token_usage: List[TokenUsageAttempt] = []  # Track all attempts for token accounting
            single_prediction_format = SinglePredictionOutputFormat()

            async with semaphore:  # Limit concurrent connections
                for attempt in range(max_retries):
                    attempt_number = attempt + 1
                    try:
                        # This will also apply rate limiting internally
                        result = await ExperimentService.predict_single_run_cluster_unit(
                            experiment_entity=experiment_entity,
                            label_template_entity=label_template_entity,
                            cluster_unit_entity=cluster_unit_entity,
                            open_router_api_key=open_router_api_key,
                            prompt_entity=prompt_entity,
                            single_prediction_format=single_prediction_format,
                            attempt_number=attempt_number,
                            all_attempts_token_usage=all_attempts_token_usage,  # Pass the list to accumulate attempts
                            max_retry_attempts=max_retry_attempts_rate_limter, # Retry limit for rate limiter
                            run_index=run_index,

                        )
                        logger.debug(f"Completed prediction for unit {cluster_unit_entity.id}, run {run_index}")
                        single_prediction_format.insert_parsed_categories(result)
                        single_prediction_format.set_success("success")
                        return single_prediction_format
                    except Exception as e:
                        is_last_attempt = attempt == max_retries - 1
                        
                        # Log the error
                        if is_last_attempt:
                            error_message = f"Failed prediction for unit {cluster_unit_entity.id}, run {run_index} " +\
                                            f"after {max_retries} attempts: {e}"
                            
                        else:
                            error_message = f"Failed prediction for unit {cluster_unit_entity.id}, run {run_index} " +\
                                            f"(attempt {attempt_number}/{max_retries}): {e}"

                        logger.warning(error_message, exc_info=True)

                        single_prediction_format.insert_error(error_message)


                        # If this is the last attempt, give up
                        if is_last_attempt:
                            single_prediction_format.set_success("fail")
                            return single_prediction_format

                        # linear backoff: 20s, 40s, 60s, etc.
                        wait_time = 20 * attempt
                        logger.info(f"Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)
                    finally:
                        single_prediction_format.all_attempts_token_usage = all_attempts_token_usage

        # Create all tasks
        tasks = []
        for cluster_unit_entity in cluster_unit_enities:
            for run_index in range(experiment_entity.runs_per_unit):
                tasks.append(predict_single_with_semaphore_and_retry(cluster_unit_entity, run_index))

        logger.info(f"Created {len(tasks)} prediction tasks")

        # Execute with gather # Run the async predictions -> Results in one dimensional list of predictions
        list_predictions_output_format: List[SinglePredictionOutputFormat] = await asyncio.gather(
            *tasks,
            return_exceptions=True
        )

        predictions_output_format = PredictionsGroupedOutputFormat.parse_from_predicted_units(
            list_predictions_output_format=list_predictions_output_format,
            cluster_unit_enities=cluster_unit_enities,
            runs_per_unit=experiment_entity.runs_per_unit)
        # Filter out None results and count failures
        successful_predictions, failed_count = predictions_output_format.get_count_successful_failure_predictions()

        if failed_count > 0:
            logger.warning(f"Completed with {successful_predictions} successful predictions, "
                         f"{failed_count} failed after retries")
        else:
            logger.info(f"Finished with {len(tasks)} prediction tasks, all successful")
        
        return predictions_output_format

        
    

    @staticmethod
    def update_add_to_db_cluster_unit_predictions(
        predictions_grouped_output_format_object: PredictionsGroupedOutputFormat,
        experiment_entity: ExperimentEntity) -> List[ClusterUnitEntity]:
        """updates the predictions, by adding them to a cluster unit map which is a dictionary. Then it sends off 
        the predictions to the mongo db database. Also it returns the updates cluster unit enitites """
        # turn the 1D list of predictions in into a nested list, where each nest is a single cluster unit
        completed_cluster_unit_entities: List[ClusterUnitEntity] = list()
        
        cluster_unit_map_predictions: Dict[PyObjectId, ClusterUnitEntityPredictedCategory] = dict() # {ClusterUnitEntity.id : List}
        success_count, failure_count = predictions_grouped_output_format_object.get_count_successful_failure_predictions()
        logger.info(f"Preparing {success_count} grouped prediction categories for database and skipping {failure_count} because of failure")
        # Fill the cluster unit map predictions. Which is the cluster unit id as key with the predictions as value
        for cluster_unit_entity_id, grouped_prediction_output_format in predictions_grouped_output_format_object.cluster_unit_predictions_map.items():
            # IF not successful, we should skip
            if grouped_prediction_output_format.all_predictions_successfull():
                
                cluster_unit_predicted_category = grouped_prediction_output_format.create_set_predicted_category(experiment_entity=experiment_entity)
                cluster_unit_map_predictions[cluster_unit_entity_id] = cluster_unit_predicted_category
                completed_cluster_unit_entities.append(grouped_prediction_output_format.cluster_unit_entity)

        if success_count == 0:
            return completed_cluster_unit_entities
        get_cluster_unit_repository().insert_many_predicted_categories(experiment_id=experiment_entity.id,
                                                                       predictions_map=cluster_unit_map_predictions)
        return completed_cluster_unit_entities

  

    @staticmethod
    async def predict_single_run_cluster_unit(
        experiment_entity: ExperimentEntity,
        label_template_entity: LabelTemplateEntity,
        cluster_unit_entity: ClusterUnitEntity,
        open_router_api_key: str,
        prompt_entity: PromptEntity,
        single_prediction_format: SinglePredictionOutputFormat,
        attempt_number: int = 1,
        all_attempts_token_usage: list = None,
        max_retry_attempts: Optional[int] = 5,
        run_index: int = 1
    ) -> PredictionCategoryTokens:
        """
        Make a single prediction run for a cluster unit.

        CRITICAL: Token tracking happens at multiple stages:
        1. Immediately after LLM response (before any parsing)
        2. Accumulated in all_attempts list (survives retries)
        3. Attached to final prediction result

        This ensures tokens are NEVER lost, even if prediction parsing fails.
        """
        # if not prompt_entity.category == PromptCategory.Classify_cluster_units:
        #     raise Exception("The prompt is of the wrong type!!!")

        if all_attempts_token_usage is None:
            all_attempts_token_usage = []

        parsed_prompt = ExperimentService.parse_classification_prompt(cluster_unit_entity, prompt_entity, label_template_entity)
        single_prediction_format.insert_input_prompt(parsed_prompt)
        single_prediction_format.insert_system_prompt(prompt_entity.system_prompt)
        # Make the LLM call
        response = await LLMService.send_to_model(
            open_router_api_key=open_router_api_key,
            system_prompt=prompt_entity.system_prompt,
            prompt=parsed_prompt,
            model=experiment_entity.model_id,
            reasoning_effort=experiment_entity.reasoning_effort,
            max_retry_attempts=max_retry_attempts
        )
        model_output_message = LLMService().get_output_message_from_llm_response(response)
        single_prediction_format.insert_model_output_message(model_output_message)

        # CRITICAL: Extract tokens IMMEDIATELY, before any parsing that might fail
        tokens_used = LLMService.extract_tokens_from_response(response)
        single_prediction_format.insert_model_tokens(tokens_used)
        

        # Try to parse the prediction (this is what might fail)
        try:
            prediction_category_tokens = LLMService.response_to_prediction_tokens(response=response, experiment_entity=experiment_entity, label_template_entity=label_template_entity, all_attempts_token_usage=all_attempts_token_usage)

            # Record this successful attempt
            all_attempts_token_usage.append(TokenUsageAttempt(
                tokens_used=tokens_used,
                attempt_number=attempt_number,
                success=True,
                error_message=None
            ))

            # Update the prediction with all attempts
            prediction_category_tokens.all_attempts_token_usage = all_attempts_token_usage.copy()
            prediction_category_tokens.total_tokens_all_attempts = LLMService._aggregate_token_usage(all_attempts_token_usage)

            return prediction_category_tokens

        except Exception as e:
            # Parsing failed, but we STILL track the tokens
            all_attempts_token_usage.append(TokenUsageAttempt(
                tokens_used=tokens_used,
                attempt_number=attempt_number,
                success=False,
                error_message=str(e)
            ))

            # Re-raise the exception so retry logic kicks in
            # But tokens are already saved in all_attempts list
            raise


    @staticmethod
    def convert_total_predicted_into_aggregate_results(cluster_unit_entities: List[ClusterUnitEntity], 
                                                       experiment_entity: ExperimentEntity,
                                                       label_template_entity: LabelTemplateEntity) -> ExperimentEntity:
        """Coonverts the experiment into aggrate results. Measures how often it is correct in its prediction and how often it is not"""
        
        prevelance_distribution_list_all_entities = []
        for cluster_unit_entity in cluster_unit_entities:
            if cluster_unit_entity.predicted_category is None:
                raise Exception(f"We cannot calculate the predicted category if this category is None, an issue must be there \n experiment_id: {experiment_entity.id} \n cluster_unit_entity: {cluster_unit_entity.id}")
            prediction_counter_single_unit: ClusterUnitPredictionCounter = ExperimentService.create_prediction_counter_from_cluster_unit(cluster_unit_entity=cluster_unit_entity, experiment_entity=experiment_entity, combined_labels=label_template_entity.combined_labels)
            # Below we go over the possible categories, and how often they have been counted. Then we find the corresponding variable in aggregate results
            # Then we increase the counter of aggregate results with 1. This allows us to track how many runs have predicted that label.
            if label_template_entity.combined_labels:
                prediction_is_ground_truth_combined_labels: Dict[str, bool] = {combined_label_name: False for combined_label_name in label_template_entity.combined_labels.keys()}
                prediction_predicted_true_combined_labels_min_count: Dict[str, int] = {combined_label_name: 0 for combined_label_name in label_template_entity.combined_labels.keys()}
            for prediction_category_name, label_prediction_counter in prediction_counter_single_unit.labels_prediction_counter.items():
                ground_truth_value: bool = cluster_unit_entity.get_value_of_ground_truth_variable(label_template_id=label_template_entity.id, variable_name=prediction_category_name)
                experiment_entity.insert_label_prediction_counter(label_prediction_counter, ground_truth_value)
                

                # Only execute the combined labels logic if combined labels is set and 
                if label_template_entity.combined_labels:
                    for combined_label_name, combined_label_labels in label_template_entity.combined_labels.items():
                        if prediction_category_name in combined_label_labels:
                            
                            if ground_truth_value:
                                prediction_is_ground_truth_combined_labels[combined_label_name] = True

                            # only if true is predicted, at least number of thresholds of runs must have true to become combined labels true
                            # :TODO only works for booleans, make all categories and int! 
                            if label_prediction_counter.value_counter.get(str(True), 0) >= prediction_predicted_true_combined_labels_min_count.get(combined_label_name, 0):
                                prediction_predicted_true_combined_labels_min_count[combined_label_name] = label_prediction_counter.value_counter.get(str(True), 0)
            if label_template_entity.combined_labels:
                
                experiment_entity.aggregate_result.insert_combined_labels_unit_prediction(
                    list(label_template_entity.combined_labels.keys()),
                    prediction_is_ground_truth_combined_labels,
                    prediction_predicted_true_combined_labels_min_count)
        
                        
                

        return experiment_entity


    @staticmethod
    def create_prediction_counter_from_cluster_unit(cluster_unit_entity: ClusterUnitEntity, experiment_entity: ExperimentEntity, combined_labels: Optional[Dict[str, List[LabelName]]] = None) -> ClusterUnitPredictionCounter:
        """counts how often each of the classes in the prediction category are true accross the runs of the prediction.
        Works in a way that allows for changing of the prediction category variables or naming"""
        return cluster_unit_entity.predicted_category[experiment_entity.id].get_cluster_unit_prediction_counter(combined_labels=combined_labels)



    @staticmethod
    def calculate_and_store_wasted_token_statistics(
        predictions_grouped_output_format_object: PredictionsGroupedOutputFormat,
        experiment_entity: ExperimentEntity
    ) -> None:
        """calculates the wasted tokens. Assumes that all cluster_unit_entities provided failed"""
        current_round_wasted_tokens = predictions_grouped_output_format_object.get_wasted_tokens()
        experiment_entity.token_statistics.tokens_wasted_on_failures.add_other_token_usage(current_round_wasted_tokens)


    @staticmethod
    def calculate_and_store_token_statistics(
        cluster_unit_entities: List[ClusterUnitEntity],
        experiment_entity: ExperimentEntity
    ) -> None:
        """
        Calculate comprehensive token statistics across all predictions in the experiment.
        This captures:
        - Total tokens used (including all retries)
        - Tokens wasted on failed attempts
        - Tokens from retry attempts
        - Success/failure counts

        Also the experiment cost is calculated if model pricing is available in the object
        """
        total_successful_predictions = 0
        total_failed_attempts = 0

        for cluster_unit_entity in cluster_unit_entities:
            if cluster_unit_entity.predicted_category is None:
                continue

            predicted_category_data = cluster_unit_entity.predicted_category.get(experiment_entity.id)
            if not predicted_category_data:
                continue

            # Iterate through all prediction runs for this cluster unit
            for prediction in predicted_category_data.predicted_categories:
                if not isinstance(prediction, PredictionCategoryTokens):
                    continue

                # Count successful prediction
                total_successful_predictions += 1

                # Process all attempts for this prediction
                for attempt in prediction.all_attempts_token_usage:
                    experiment_entity.token_statistics.total_tokens_used.add_token_usage_attempt(attempt)

                    if not attempt.success:
                        total_failed_attempts += 1
                        experiment_entity.token_statistics.tokens_wasted_on_failures.add_token_usage_attempt(attempt)
                    

                    if attempt.attempt_number > 1:
                        experiment_entity.token_statistics.tokens_from_retries.add_token_usage_attempt(attempt)

        # Calculate the cost of the model
        if experiment_entity.model_pricing is not None:
            
            total_cost = experiment_entity.calculate_and_set_total_cost()#.total_tokens_used.calculate_total_cost(experiment_entity.model_pricing)
        else:
            logger.error("the experiment does not have a model pricing. So we cannot calculate the total cost of the experiment")
            total_cost = 0

        # Store in experiment entity
        experiment_entity.token_statistics.total_successful_predictions = total_successful_predictions
        experiment_entity.token_statistics.total_failed_attempts = total_failed_attempts

        logger.info(f"Token Statistics for Experiment ", extra={'extra_fields': {"experiment_entity": experiment_entity.id} })
        logger.info(f"  Experiment cost spend = {total_cost}$")
        logger.info(f"  Successful predictions: {total_successful_predictions}")
        logger.info(f"  Failed attempts: {total_failed_attempts}")
        logger.info(f"  Total tokens: {experiment_entity.token_statistics.total_tokens_used}")
        logger.info(f"  Tokens wasted: {experiment_entity.token_statistics.tokens_wasted_on_failures}")
        logger.info(f"  Tokens from retries: {experiment_entity.token_statistics.tokens_from_retries}")

    @staticmethod
    def parse_classification_prompt(cluster_unit_entity: ClusterUnitEntity, prompt_entity: PromptEntity, label_template_entity: LabelTemplateEntity):
        # if not prompt_entity.category == PromptCategory.Classify_cluster_units:
        #     raise Exception("The prompt is of the wrong type!!!")
        prompt = prompt_entity.prompt

        # prompt += label_template_entity.create_llm_prompt_explanation_with_response_format()

        formatted_prompt = ExperimentService.parse_prompt_cluster_unit_entity(
            cluster_unit_entity=cluster_unit_entity,
            prompt=prompt,
            label_template_entity=label_template_entity
            )

        return formatted_prompt
    
    @staticmethod
    def parse_prompt_cluster_unit_entity(cluster_unit_entity: ClusterUnitEntity, prompt: str, label_template_entity: LabelTemplateEntity):
        """creates all the variables that could be in the prompt. Then subsequenty they are added into the prompt, if they are given with {{variable_name}}"""
        label_template_one_shot_example = json.dumps(label_template_entity.create_one_shot_llm_prompt(), indent=4)
        label_template_variable_expected_output = label_template_entity.create_prompt_variable_expected_output()
        label_template_variable_descriptions= label_template_entity.create_prompt_variable_description()
        label_template_description = label_template_entity.create_prompt_template_description()
        label_template_name = label_template_entity.create_prompt_template_name()
        # prompt += label_template_entity.create_llm_prompt_explanation_with_response_format()

        formatted_prompt = LlmHelper.custom_formatting(
            prompt=prompt,
            conversation_thread=ExperimentService.parse_conversation_thread(cluster_unit_entity.thread_path_text, cluster_unit_entity.thread_path_author),
            final_reddit_author=cluster_unit_entity.author,
            final_reddit_message=cluster_unit_entity.text,
            label_template_name=label_template_name,
            label_template_description=label_template_description,
            label_template_variable_descriptions=label_template_variable_descriptions,
            label_template_variable_expected_output=label_template_variable_expected_output,
            label_template_one_shot_example=label_template_one_shot_example)

        return formatted_prompt
    
    @staticmethod
    def parse_conversation_thread(thread_path_text: List[str], thread_path_author: List[str]):
        if not thread_path_text:
            return "Final reddit message is the reddit post, so no conversation thread available"
        combined_author_text = ""
        if len(thread_path_text) != len(thread_path_author):
            for index, text in enumerate(thread_path_text):
                
                new_text = f"<author: {index} indent={index}> {text} </author: {index}>"
                combined_author_text += new_text
            
            return combined_author_text
        else:
            for index, text in enumerate(thread_path_text):
                new_text = f"<author: {thread_path_author[index]} indent={index}> {text} </author: {thread_path_author[index]}>"
                combined_author_text += new_text + "\n"
            
            return combined_author_text
            

    

    @staticmethod
    def convert_experiment_entities_for_user_interface(experiment_entities: List[ExperimentEntity], 
                                                       sample_size: int,
                                                       user_threshold: Optional[float] = None) -> List[GetExperimentsResponse]:
        """user threshold, is the minimum number of occurences out of the runs to be correct in order for the prediction to be accepted
        for example 2/3 runs need to be correct or 3/3 runs need to be correct. Or 3/5 depending on the runs taken. """
        returnable_experiments = []
        sorted_experiment_entities = sorted(experiment_entities, key=lambda x: x.created_at, reverse=False)
        combined_labels_prediction_metrics = None
        combined_labels_accuracy = None
        combined_labels_kappa = None
        for index, experiment in enumerate(sorted_experiment_entities):
            print("experiment status = ", experiment.status)
            if experiment.status != StatusType.Completed:
                prediction_metrics = None
                overall_accuracy = None
                overall_kappa = None
            elif experiment.experiment_type == PromptCategory.Classify_cluster_units:
                prediction_metrics = ExperimentService.calculate_prediction_metrics(experiment, sample_size, user_threshold)
                overall_accuracy = ExperimentService.calculate_overal_accuracy(prediction_metrics)
                overall_kappa = ExperimentService.calculate_overall_consistency(prediction_metrics)

                if experiment.aggregate_result.combined_labels:
                    combined_labels_prediction_metrics = ExperimentService.calculate_prediction_metrics_combined_labels(experiment, sample_size, user_threshold)
                    combined_labels_accuracy = ExperimentService.calculate_overal_accuracy(combined_labels_prediction_metrics)
                    combined_labels_kappa = ExperimentService.calculate_overall_consistency(combined_labels_prediction_metrics)
            elif experiment.experiment_type == PromptCategory.Rewrite_cluster_unit_standalone:
                prediction_metrics = None
                overall_accuracy = None
                overall_kappa = None
            elif experiment.experiment_type == PromptCategory.Summarize_prediction_notes:
                prediction_metrics = None
                overall_accuracy = None
                overall_kappa = None
            #:TODO Fix that I keep track of what version of prompt I am using
            experiment_response = GetExperimentsResponse(id=experiment.id,
                                                         name=f"{experiment.model_id} V{index}",
                                                         model=experiment.model_id,
                                                         prompt_id=experiment.prompt_id,
                                                         created=experiment.created_at,
                                                         total_samples=sample_size,
                                                         overall_accuracy=overall_accuracy,
                                                         overall_kappa=overall_kappa,
                                                         prediction_metrics=prediction_metrics,
                                                         combined_labels_prediction_metrics=combined_labels_prediction_metrics,
                                                         combined_labels_accuracy=combined_labels_accuracy,
                                                         combined_labels_kappa=combined_labels_kappa,
                                                         runs_per_unit=experiment.runs_per_unit,
                                                         label_template_id=experiment.label_template_id,
                                                         threshold_runs_true=experiment.threshold_runs_true,
                                                         reasoning_effort=experiment.reasoning_effort,
                                                         token_statistics=experiment.token_statistics,
                                                         experiment_cost=experiment.experiment_cost,
                                                         status=experiment.status,
                                                         experiment_type=experiment.experiment_type)
            
            returnable_experiments.append(experiment_response)  
        
        returnable_experiments = sorted(returnable_experiments, key=lambda x: x.created, reverse=True)

        return [experiment.model_dump() for experiment in returnable_experiments]
    
    @staticmethod
    def calculate_overal_accuracy(prediction_metrics: List[PredictionMetric] | None) -> float | None:
        """Takes the accuracy of each prediction_metric, weights it according to its prevelance. And combines the accuracies"""
        if not prediction_metrics:
            return None
        combined_accuracy = 0
        for prediction_metric in prediction_metrics:
            combined_accuracy += prediction_metric.accuracy #* prediction_metric.prevalence_count
        
        # combined_prevalance = sum([prediction_metric.prevalence_count for prediction_metric in prediction_metrics])
        # if combined_prevalance:
        #     combined_accuracy /= combined_prevalance
        return combined_accuracy / len(prediction_metrics)
    

    @staticmethod
    def calculate_overall_consistency(prediction_metrics: List[PredictionMetric] | None) -> float | None:
        """Takes the consistency of each prediction_metric, weights it according to its prevelance. And combines the consistency"""
        combined_kappa = 0
        if not prediction_metrics:
            return None
        for prediction_metric in prediction_metrics:
            combined_kappa += prediction_metric.kappa #* prediction_metric.prevalence_count
        
        # combined_prevalance = sum([prediction_metric.prevalence_count for prediction_metric in prediction_metrics])
        # if combined_prevalance:
        #     combined_kappa /= combined_prevalance
        return combined_kappa / len(prediction_metrics)
    
    
    @staticmethod
    def calculate_prediction_metrics(experiment_entity: ExperimentEntity,
                                     sample_size: int,
                                     user_threshold: Optional[float] = None) -> List[PredictionMetric] | None:
        total_prediction_metrics: List[PredictionMetric] = list()
        if experiment_entity.aggregate_result is None:
            return None
        for prediction_result_variable_name, prediction_result in experiment_entity.aggregate_result.labels.items():
            
            prediction_metric = ExperimentService.calculate_single_prediction_metric(experiment_entity=experiment_entity,
                                                                                     prediction_result=prediction_result,
                                                                                     prediction_result_name=prediction_result_variable_name,
                                                                                     sample_size=sample_size,
                                                                                     user_threshold=user_threshold)
            
            total_prediction_metrics.append(prediction_metric)
        
        return total_prediction_metrics
    
    def calculate_prediction_metrics_combined_labels(experiment_entity: ExperimentEntity,
                                                     sample_size: int,
                                                     user_threshold: Optional[float] = None) -> List[PredictionMetric] | None:
        """calculates the prediction metric from the combined labels"""
        total_prediction_metrics: List[PredictionMetric] = list()
        if experiment_entity.aggregate_result.combined_labels is None:
            return None
        for combined_prediction_name, combined_prediction_result in experiment_entity.aggregate_result.combined_labels.items():
            prediction_result: PredictionResult = PredictionResult.from_combined_prediction_result(combined_prediction_result)
            prediction_metric = ExperimentService.calculate_single_prediction_metric(experiment_entity=experiment_entity,
                                                                                     prediction_result=prediction_result,
                                                                                     prediction_result_name=combined_prediction_name,
                                                                                     sample_size=sample_size,
                                                                                     user_threshold=user_threshold)
            
            total_prediction_metrics.append(prediction_metric)
            
    
    @staticmethod
    def calculate_total_times_predicted(prediction_result: PredictionResult) -> Dict[str, int]:
        """
        calculates how often an LLM predicted this category to be true from the prevelance dict e.g.
        {"True": {"3": 120, "2": 40, "1": 10, "0": 100}, "False":  {"3": 120, "2": 40, "1": 10, "0": 100}}
        becomes 3 *120 + 2 * 40 + 1 * 10 + 0 * 100 = 450 times LLM model predicted true
        {"True": 450, "False": 120}

        the max is number_of_runs * sample_size
        """
        total_times_predicted: Dict[str, int] = defaultdict(int)
        for value_key, prevelance_dict in prediction_result.prevelance_distribution.items():
            for runs_predicted_true_count, occurences in prevelance_dict.items():
                total_times_predicted[str(value_key)] += int(runs_predicted_true_count) * int(occurences)
            
            return total_times_predicted
    
    @staticmethod
    def get_user_threshold(experiment_entity: ExperimentEntity,user_threshold: Optional[float] = None ):
        if user_threshold:
            min_runs =  math.ceil(user_threshold * experiment_entity.runs_per_unit)
        if user_threshold is None:
            if experiment_entity.threshold_runs_true:
                min_runs = experiment_entity.threshold_runs_true
            else:
                min_runs = math.ceil(experiment_entity.runs_per_unit/2)
        
        return min(min_runs, experiment_entity.runs_per_unit)
            

    @staticmethod
    def calculate_single_prediction_metric(experiment_entity: ExperimentEntity, 
                                           prediction_result: PredictionResult,
                                           prediction_result_name: str,
                                           sample_size: int,
                                           user_threshold: Optional[float] = None) -> PredictionMetric:
        """calculates everything that is needed for the prediction metric to be created and returns that"""
        formatted_user_threshold = ExperimentService.get_user_threshold(experiment_entity=experiment_entity, user_threshold=user_threshold)
        total_times_predicted = ExperimentService.calculate_total_times_predicted(prediction_result)

        total_sample_runs = sample_size * experiment_entity.runs_per_unit
        prevelance = {value_key: times_predicted/total_sample_runs for value_key, times_predicted in total_times_predicted.items()}
        
        confusion_matrix = ExperimentService.calculate_confusion_matrix(prediction_result=prediction_result,
                                                                        user_threshold=formatted_user_threshold,
        )
                                               
        prediction_metric = PredictionMetric(prediction_category_name=prediction_result_name, 
                                              prevalence_count=total_times_predicted,
                                              prevalence=prevelance,
                                              total_samples=total_sample_runs,
                                              accuracy=confusion_matrix.get_accuracy(),
                                              kappa=confusion_matrix.get_cohens_kappa(),
                                              prevelance_distribution=prediction_result.prevelance_distribution,
                                              confusion_matrix=confusion_matrix,
                                              )
        return prediction_metric
        
    @staticmethod
    def calculate_confusion_matrix(prediction_result: PredictionResult,
                                   user_threshold: int
                                   ) -> ConfusionMatrix:
        true_positives = 0
        true_negatives = 0
        false_positives = 0
        false_negatives= 0
        for prediction_cluster_unit in prediction_result.individual_prediction_truth_label_list:
            # :TODO here should change the confusion matrix for categories with 3+ categories. if we would like a 3x3 confusion matrix
            if str(prediction_cluster_unit.value_key) == str(True):
                # the threshold only works for labels with true of false values
                if prediction_cluster_unit.runs_predicted >= user_threshold:
                  predicted_val = True
                else:
                    predicted_val = False
            elif str(prediction_cluster_unit.value_key) == str(False):
                predicted_val = False
            else:
                predicted_val = None

            if predicted_val == True and prediction_cluster_unit.is_ground_truth == True:
                true_positives += 1
            elif predicted_val == False and prediction_cluster_unit.is_ground_truth == True:
                false_negatives += 1
            elif predicted_val == True and prediction_cluster_unit.is_ground_truth == False:
                false_positives += 1
            elif predicted_val == False and prediction_cluster_unit.is_ground_truth == False:
                true_negatives += 1
                
        
        return ConfusionMatrix(
            tp=true_positives,
            fp=false_positives,
            tn=true_negatives,
            fn=false_negatives

        )
    
    @staticmethod
    async def test_predictions(        
        experiment_entity: ExperimentEntity,
        label_template_entity: LabelTemplateEntity,
        prompt_entity: PromptEntity,
        cluster_unit_enities: List[ClusterUnitEntity]
        ) -> List[List[SinglePredictionOutputFormat]]:
        experiment_entity.runs_per_unit = 1
        predictions_output_format = await ExperimentService.create_predicted_categories(
                experiment_entity=experiment_entity,
                label_template_entity=label_template_entity,
                prompt_entity=prompt_entity,
                cluster_unit_enities=cluster_unit_enities, 
                max_concurrent=20,
                max_retries=1,
                max_retry_attempts_rate_limter=1)
        return predictions_output_format.get_single_predictions_output_format()
        


    @staticmethod
    def get_input_cluster_unit_entities_from_expertiment(experiment_entity: PyObjectId) -> List[ClusterUnitEntity]:
        if experiment_entity.input_type == "sample":
        
            sample_entity = get_sample_repository().find_by_id(experiment_entity.input_id)

            if not sample_entity:
                raise Exception(f"the provided sample of the experiment_entity not exist| sample_id: {experiment_entity.input_id}")
            
            if not sample_entity.sample_cluster_unit_ids:
                raise Exception(f"No cluster units have been assigned in the sample for us to do an experiment with | sample_id: {experiment_entity.input_id}")
            
            cluster_unit_entities = get_cluster_unit_repository().find_many_by_ids(sample_entity.sample_cluster_unit_ids)

            if not cluster_unit_entities or not len(cluster_unit_entities) == len(sample_entity.sample_cluster_unit_ids):
                raise Exception(f"not all Cluster unit ids are found cannot be found for sample: {sample_entity.id}")

        elif experiment_entity.input_type == "filtering":
            
            filtering_entity = get_filtering_repository().find_by_id(experiment_entity.input_id)

            if not filtering_entity:
                raise Exception(f"No filtering entity with id = {experiment_entity.input_id} is findable")
            
            if not filtering_entity.output_cluster_unit_ids:
                raise Exception(f"missing output_cluster_unit_entities_ids for filtering entity id = {filtering_entity.id}")

            cluster_unit_entities = get_cluster_unit_repository().find_many_by_ids(filtering_entity.output_cluster_unit_ids)

            if not cluster_unit_entities or not len(cluster_unit_entities) == len(filtering_entity.output_cluster_unit_ids):
                raise Exception(f"not all Cluster unit ids are found cannot be found for filtering entity in experiment: {experiment_entity.id}")

        elif experiment_entity.input_type == "cluster":
            
            cluster_entity = get_cluster_repository().find_by_id(experiment_entity.input_id)
            if not cluster_entity:
                raise Exception(f"There is no cluster entity found, id = {experiment_entity.input_id}")
            
            cluster_unit_entities = get_cluster_unit_repository().find({"cluster_entity_id": experiment_entity.input_id})
            
            if not cluster_unit_entities:
                raise Exception(f"Cluster unit ids are not found cannot be found for cluster entity in experiment: {experiment_entity.id}")

        else:
            raise Exception(f"unknown input type is given! type = {experiment_entity.input_type}")

        return cluster_unit_entities
    
    
    @staticmethod
    def filter_cluster_units_predicted_experiments(cluster_unit_entities: List[ClusterUnitEntity], filter_label_template_id: Optional[str] = None, filter_experiment_type: Optional[PromptCategory] = None) -> List[ClusterUnitEntity]:
        if filter_experiment_type is None and filter_label_template_id is None:
            return cluster_unit_entities
        
        experiment_ids = list({experiment_id for cluster_unit in cluster_unit_entities for experiment_id in cluster_unit.predicted_category.keys()})
        experiment_entities = get_experiment_repository().find_many_by_ids(experiment_ids)

        experiment_entities_to_remove: List[ExperimentEntity] = list()
        if filter_experiment_type:
            
            experiment_entities_to_remove_wrong_type = [experiment_entity for experiment_entity in experiment_entities if experiment_entity.experiment_type != filter_experiment_type]
            experiment_entities_to_remove.extend(experiment_entities_to_remove_wrong_type)
        if filter_label_template_id:
            
            experiment_entities_to_remove_wrong_label_template = [experiment_entity for experiment_entity in experiment_entities if experiment_entity.label_template_id != filter_label_template_id]
            experiment_entities_to_remove.extend(experiment_entities_to_remove_wrong_label_template)
        
        # Removing the predicted categories
        for experiment_entity in experiment_entities_to_remove:
            for cluster_unit in cluster_unit_entities:
                if experiment_entity.id in cluster_unit.predicted_category:
                    cluster_unit.predicted_category.pop(experiment_entity.id)
        
        return cluster_unit_entities
    
    @staticmethod
    def filter_cluster_units_ground_truth(cluster_unit_entities: List[ClusterUnitEntity], filter_label_template_id: Optional[str] = None):
        if filter_label_template_id is None:
            return cluster_unit_entities
        
        for cluster_unit_entity in cluster_unit_entities:
            cluster_unit_entity.ground_truth = {filter_label_template_id: cluster_unit_entity.ground_truth.pop(filter_label_template_id)}
        
        return cluster_unit_entities