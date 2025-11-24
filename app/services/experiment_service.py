# Experiment_service
import sys

import asyncio
import json
import logging
from typing import Dict, List, Optional
from collections import defaultdict
import math

from pydantic import BaseModel
from app.database.entities.cluster_unit_entity import ClusterUnitEntityPredictedCategory, PredictionCategory, PredictionCategoryTokens, ClusterUnitEntity, ClusterUnitEntityCategory, TokenUsageAttempt
from app.database import get_cluster_unit_repository, get_experiment_repository
from app.database.entities.experiment_entity import AggregateResult, ExperimentEntity, PredictionResult, PrevelanceUnitDistribution
from app.database.entities.prompt_entity import PromptCategory, PromptEntity
from app.database.entities.sample_entity import SampleEntity
from app.responses.get_experiments_response import ConfusionMatrix, GetExperimentsResponse, PredictionMetric
from app.services.llm_service import LLMService
from app.utils.llm_helper import LlmHelper
from app.utils.types import StatusType


logger = logging.getLogger(__name__)


class ExperimentService:
    """This class is all about creating experiments with a limited amount of cluster units. sending them to an LLM with the respective prompt"""


    @staticmethod
    async def predict_categories_cluster_units(
        experiment_entity: ExperimentEntity, 
        cluster_unit_entities: List[ClusterUnitEntity], 
        prompt_entity: PromptEntity, 
        max_concurrent: int=1000):
        """this function orchestrates the prediction of the cluster unit entity and propagates it into the experiement entity"""
        if not prompt_entity.category == PromptCategory.Classify_cluster_units:
            raise Exception("The prompt is of the wrong type!!!")
        # First we filter the cluster units that we have not yet predicted the category for. Might happen if we have predicted a part of clusterunits
        cluster_unit_entities_remain = [cluster_unit_entity for cluster_unit_entity in cluster_unit_entities if not (cluster_unit_entity.predicted_category and cluster_unit_entity.predicted_category.get(experiment_entity.id))]
        cluster_unit_entities_done = [cluster_unit_entity for cluster_unit_entity in cluster_unit_entities if (cluster_unit_entity.predicted_category and cluster_unit_entity.predicted_category.get(experiment_entity.id))]
        # If all cluster units are already predicted. We should stop the function early
        if not cluster_unit_entities_remain:
            return 0
        
        logger.info(f"Starting prediction for {len(cluster_unit_entities_remain)} units, "
                   f"{experiment_entity.runs_per_unit} runs each")
        
        predicted_categories = await ExperimentService.create_predicted_categories(
            experiment_entity=experiment_entity,
            prompt_entity=prompt_entity,
            cluster_unit_enities=cluster_unit_entities_remain, 
            max_concurrent=max_concurrent)

        cluster_unit_entities_remain = ExperimentService.update_add_to_db_cluster_unit_predictions(predicted_categories=predicted_categories,
                                                                    cluster_units_enitities_as_predicted=cluster_unit_entities_remain,
                                                                    experiment_entity=experiment_entity)
        
        cluster_unit_entities_done.extend(cluster_unit_entities_remain)
        ExperimentService.convert_total_predicted_into_aggregate_results(cluster_unit_entities_done, experiment_entity)

        # Calculate and store aggregate token statistics
        ExperimentService.calculate_and_store_token_statistics(cluster_unit_entities_done, experiment_entity)

        experiment_entity.status = StatusType.Completed
        get_experiment_repository().update(experiment_entity.id, experiment_entity)
    

    @staticmethod
    async def create_predicted_categories(
        experiment_entity: ExperimentEntity,
        prompt_entity: PromptEntity,
        cluster_unit_enities: List[ClusterUnitEntity],
        max_concurrent=1000,
        max_retries=3) -> List[PredictionCategoryTokens]:
         # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(max_concurrent)

        async def predict_single_with_semaphore_and_retry(cluster_unit_entity, run_index):
            """
            Wrapper that ensures we don't have too many concurrent connections.
            The rate limiter (in LlmHelper) ensures we don't exceed API limits.
            Includes retry logic with exponential backoff and comprehensive token tracking.
            """
            all_attempts = []  # Track all attempts for token accounting

            async with semaphore:  # Limit concurrent connections
                for attempt in range(max_retries):
                    attempt_number = attempt + 1
                    try:
                        # This will also apply rate limiting internally
                        result = await ExperimentService.predict_single_run_cluster_unit(
                            experiment_entity=experiment_entity,
                            prompt_entity=prompt_entity,
                            cluster_unit_entity=cluster_unit_entity,
                            attempt_number=attempt_number,
                            all_attempts=all_attempts  # Pass the list to accumulate attempts
                        )
                        logger.debug(f"Completed prediction for unit {cluster_unit_entity.id}, run {run_index}")
                        return result
                    except Exception as e:
                        is_last_attempt = attempt == max_retries - 1

                        # Log the error
                        if is_last_attempt:
                            logger.error(f"Failed prediction for unit {cluster_unit_entity.id}, run {run_index} "
                                       f"after {max_retries} attempts: {e}")
                        else:
                            logger.warning(f"Failed prediction for unit {cluster_unit_entity.id}, run {run_index} "
                                         f"(attempt {attempt_number}/{max_retries}): {e}")

                        # If this is the last attempt, give up
                        if is_last_attempt:
                            return None

                        # Exponential backoff: 1s, 2s, 4s, etc.
                        wait_time = 2 ** attempt
                        logger.info(f"Retrying in {wait_time}s...")
                        await asyncio.sleep(wait_time)

        # Create all tasks
        tasks = []
        for cluster_unit_entity in cluster_unit_enities:
            for run_index in range(experiment_entity.runs_per_unit):
                tasks.append(predict_single_with_semaphore_and_retry(cluster_unit_entity, run_index))

        logger.info(f"Created {len(tasks)} prediction tasks")

        # Execute with gather # Run the async predictions -> Results in one dimensional list of predictions
        predicted_categories: List[PredictionCategoryTokens] = await asyncio.gather(
            *tasks,
            return_exceptions=True
        )

        # Filter out None results and count failures
        successful_predictions = [p for p in predicted_categories if p is not None and not isinstance(p, Exception)]
        failed_count = len(predicted_categories) - len(successful_predictions)

        if failed_count > 0:
            logger.warning(f"Completed with {len(successful_predictions)} successful predictions, "
                         f"{failed_count} failed after retries")
        else:
            logger.info(f"Finished with {len(tasks)} prediction tasks, all successful")

        return predicted_categories
    

    @staticmethod
    def update_add_to_db_cluster_unit_predictions(
        predicted_categories: List[PredictionCategoryTokens],
        cluster_units_enitities_as_predicted: List[ClusterUnitEntity],
        experiment_entity: ExperimentEntity) -> List[ClusterUnitEntity]:
        """updates the predictions, by adding them to a cluster unit map which is a dictionary. Then it sends off 
        the predictions to the mongo db database. Also it returns the updates cluster unit enitites """
        # turn the 1D list of predictions in into a nested list, where each nest is a single cluster unit
        predictions_per_unit = experiment_entity.runs_per_unit
        grouped_predicted_categories = [predicted_categories[i:predictions_per_unit+i] 
                                        for i in range(0, len(cluster_units_enitities_as_predicted)* predictions_per_unit, predictions_per_unit)]
        cluster_unit_map_predictions: Dict[PyObjectId, ClusterUnitEntityPredictedCategory] = dict() # {ClusterUnitEntity.id : List}
        print("grouped_predicted_categories = ", grouped_predicted_categories)
        # Fill the cluster unit map predictions. Which is the cluster unit id as key with the predictions as value
        for index, predictions_cluster_unit in enumerate(grouped_predicted_categories):
            cluster_unit_entity = cluster_units_enitities_as_predicted[index]
            print("predictions_cluster_unit = \n", predictions_cluster_unit)
            cluster_unit_predicted_category = ClusterUnitEntityPredictedCategory(
            experiment_id=experiment_entity.id,
            predicted_categories=predictions_cluster_unit
            )
            cluster_unit_map_predictions[cluster_unit_entity.id] = cluster_unit_predicted_category

            if cluster_unit_entity.predicted_category is None:
                cluster_unit_entity.predicted_category = {}
            cluster_unit_entity.predicted_category[experiment_entity.id] = cluster_unit_predicted_category
        
        get_cluster_unit_repository().insert_many_predicted_categories(experiment_id=experiment_entity.id,
                                                                       predictions_map=cluster_unit_map_predictions)
        return cluster_units_enitities_as_predicted

  

    @staticmethod
    async def predict_single_run_cluster_unit(
        experiment_entity: ExperimentEntity,
        cluster_unit_entity: ClusterUnitEntity,
        prompt_entity: PromptEntity,
        attempt_number: int = 1,
        all_attempts: list = None
    ) -> PredictionCategoryTokens:
        """
        Make a single prediction run for a cluster unit.

        CRITICAL: Token tracking happens at multiple stages:
        1. Immediately after LLM response (before any parsing)
        2. Accumulated in all_attempts list (survives retries)
        3. Attached to final prediction result

        This ensures tokens are NEVER lost, even if prediction parsing fails.
        """
        if not prompt_entity.category == PromptCategory.Classify_cluster_units:
            raise Exception("The prompt is of the wrong type!!!")

        if all_attempts is None:
            all_attempts = []

        parsed_prompt = ExperimentService.parse_classification_prompt(cluster_unit_entity, prompt_entity)

        # Make the LLM call
        response = await LLMService.send_to_model(
            user_id=experiment_entity.user_id,
            system_prompt=prompt_entity.system_prompt,
            prompt=parsed_prompt,
            model=experiment_entity.model,
            reasoning_effort=experiment_entity.reasoning_effort
        )

        # CRITICAL: Extract tokens IMMEDIATELY, before any parsing that might fail
        tokens_used = LLMService.extract_tokens_from_response(response)

        # Try to parse the prediction (this is what might fail)
        try:
            prediction_category_tokens = LLMService.response_to_prediction_tokens(response, all_attempts)

            # Record this successful attempt
            all_attempts.append(TokenUsageAttempt(
                tokens_used=tokens_used,
                attempt_number=attempt_number,
                success=True,
                error_message=None
            ))

            # Update the prediction with all attempts
            prediction_category_tokens.all_attempts = all_attempts.copy()
            prediction_category_tokens.total_tokens_all_attempts = LLMService._aggregate_token_usage(all_attempts)

            return prediction_category_tokens

        except Exception as e:
            # Parsing failed, but we STILL track the tokens
            all_attempts.append(TokenUsageAttempt(
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
                                                       experiment_entity: ExperimentEntity) -> int:
        
        prevelance_distribution_list_all_entities = []
        for cluster_unit_entity in cluster_unit_entities:
            if cluster_unit_entity.predicted_category is None:
                raise Exception(f"We cannot calculate the predicted category if this category is None, an issue must be there \n experiment_id: {experiment_entity.id} \n cluster_unit_entity: {cluster_unit_entity.id}")
            prediction_counter_single_unit = ExperimentService.create_prediction_counter_from_cluster_unit(cluster_unit_entity, experiment_entity)
            # Below we go over the possible categories, and how often they have been counted. Then we find the corresponding variable in aggregate results
            # Then we increase the counter of aggregate results with 1. This allows us to track how many runs have predicted that label.
            
            for prediction_category_name, count_value in prediction_counter_single_unit.items():
                prediction_category_prediction_result: PredictionResult = getattr(experiment_entity.aggregate_result, prediction_category_name)
                count_key = str(count_value)  # Convert to string for MongoDB compatibility
                prediction_category_prediction_result.prevelance_distribution[count_key] = prediction_category_prediction_result.prevelance_distribution.get(count_key, 0) + 1

                # Now we add the ground truth to the prediction result as a counter
                ground_truth_value: bool = getattr(cluster_unit_entity.ground_truth, prediction_category_name)
                prediction_category_prediction_result.individual_prediction_truth_label_list.append(PrevelanceUnitDistribution(runs_predicted_true=count_key,
                                                                                                                               ground_truth=ground_truth_value))
                if ground_truth_value:
                    prediction_category_prediction_result.sum_ground_truth += 1
        return experiment_entity


    @staticmethod
    def create_prediction_counter_from_cluster_unit(cluster_unit_entity: ClusterUnitEntity, experiment_entity: ExperimentEntity) -> Dict[str, int]:
        """counts how often each of the classes in the prediction category are true accross the runs of the prediction.
        Works in a way that allows for changing of the prediction category variables or naming"""
        tokens_used = 0
        prediction_counter = defaultdict(int)
        for prediction_category in cluster_unit_entity.predicted_category[experiment_entity.id].predicted_categories:
            prediction_category
            for variable_name in prediction_category.category_field_names():
                value = getattr(prediction_category, variable_name)
                prediction_counter[variable_name] += 1 if value else 0
        return prediction_counter

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
        """
        total_successful_predictions = 0
        total_failed_attempts = 0

        # Aggregated token counts
        total_tokens = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        tokens_wasted = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
        tokens_from_retries = {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}

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
                for attempt in prediction.all_attempts:
                    # Add to total tokens
                    for key in ["prompt_tokens", "completion_tokens", "total_tokens"]:
                        token_count = attempt.tokens_used.get(key, 0)
                        total_tokens[key] += token_count
                    
                    reasoning_tokens = attempt.tokens_used.get("completion_tokens_details", {}).get("reasoning_tokens", 0)
                    if reasoning_tokens:
                        if not total_tokens.get("reasoning_tokens"):
                            total_tokens["reasoning_tokens"] = 0
                        total_tokens["reasoning_tokens"] += reasoning_tokens
                    # Track failed attempts
                    if not attempt.success:
                        total_failed_attempts += 1
                        for key in ["prompt_tokens", "completion_tokens", "total_tokens"]:
                            token_count = attempt.tokens_used.get(key, 0)
                            tokens_wasted[key] += token_count
                        
                        reasoning_tokens = attempt.tokens_used.get("completion_tokens_details", {}).get("reasoning_tokens", 0)
                        if reasoning_tokens:
                            if not total_tokens.get("reasoning_tokens"):
                                tokens_wasted["reasoning_tokens"] = 0
                            tokens_wasted["reasoning_tokens"] += reasoning_tokens

                    # Track retry attempts (attempt_number > 1)
                    if attempt.attempt_number > 1:
                        for key in ["prompt_tokens", "completion_tokens", "total_tokens"]:
                            token_count = attempt.tokens_used.get(key, 0)
                            tokens_from_retries[key] += token_count
                        
                        reasoning_tokens = attempt.tokens_used.get("completion_tokens_details", {}).get("reasoning_tokens", 0)
                        if reasoning_tokens:
                            if not total_tokens.get("reasoning_tokens"):
                                tokens_from_retries["reasoning_tokens"] = 0
                            tokens_from_retries["reasoning_tokens"] += reasoning_tokens

        # Store in experiment entity
        experiment_entity.token_statistics.total_successful_predictions = total_successful_predictions
        experiment_entity.token_statistics.total_failed_attempts = total_failed_attempts
        experiment_entity.token_statistics.total_tokens_used = total_tokens
        experiment_entity.token_statistics.tokens_wasted_on_failures = tokens_wasted
        experiment_entity.token_statistics.tokens_from_retries = tokens_from_retries

        logger.info(f"Token Statistics for Experiment {experiment_entity.id}:")
        logger.info(f"  Successful predictions: {total_successful_predictions}")
        logger.info(f"  Failed attempts: {total_failed_attempts}")
        logger.info(f"  Total tokens: {total_tokens}")
        logger.info(f"  Tokens wasted: {tokens_wasted}")
        logger.info(f"  Tokens from retries: {tokens_from_retries}")


    @staticmethod
    def parse_classification_prompt(cluster_unit_entity: ClusterUnitEntity, prompt_entity: PromptEntity):
        if not prompt_entity.category == PromptCategory.Classify_cluster_units:
            raise Exception("The prompt is of the wrong type!!!")

        formatted_prompt = LlmHelper.custom_formatting(
            prompt=prompt_entity.prompt,
            conversation_thread=str(cluster_unit_entity.thread_path_text),
            final_reddit_message=cluster_unit_entity.text)

        return formatted_prompt
    

    @staticmethod
    def convert_experiment_entities_for_user_interface(experiment_entities: List[ExperimentEntity], 
                                                       sample_entity: SampleEntity,
                                                       user_threshold: Optional[int] = None) -> List[GetExperimentsResponse]:
        """user threshold, is the minimum number of occurences out of the runs to be correct in order for the prediction to be accepted
        for example 2/3 runs need to be correct or 3/3 runs need to be correct. Or 3/5 depending on the runs taken. """
        returnable_experiments = []
        sorted_experiment_entities = sorted(experiment_entities, key=lambda x: x.created_at, reverse=False)

        for index, experiment in enumerate(sorted_experiment_entities):
            print("experiment status = ", experiment.status)
            prediction_metrics = ExperimentService.calculate_prediction_metrics(experiment, sample_entity, user_threshold)
            overall_accuracy = ExperimentService.calculate_overal_accuracy(prediction_metrics)
            overall_kappa = ExperimentService.calculate_overall_consistency(prediction_metrics)
            #:TODO Fix that I keep track of what version of prompt I am using
            experiment_response = GetExperimentsResponse(id=experiment.id,
                                                         name=f"{experiment.model} V{index}",
                                                         model=experiment.model,
                                                         created=experiment.created_at,
                                                         total_samples=sample_entity.sample_size,
                                                         overall_accuracy=overall_accuracy,
                                                         overall_kappa=overall_kappa,
                                                         prediction_metrics=prediction_metrics,
                                                         runs_per_unit=experiment.runs_per_unit,
                                                         reasoning_effort=experiment.reasoning_effort,
                                                         token_statistics=experiment.token_statistics,
                                                         status=experiment.status)
            
            returnable_experiments.append(experiment_response)  
        
        returnable_experiments = sorted(returnable_experiments, key=lambda x: x.created, reverse=True)

        return [experiment.model_dump() for experiment in returnable_experiments]
    
    @staticmethod
    def calculate_overal_accuracy(prediction_metrics: List[PredictionMetric]) -> float:
        """Takes the accuracy of each prediction_metric, weights it according to its prevelance. And combines the accuracies"""
        combined_accuracy = 0
        for prediction_metric in prediction_metrics:
            combined_accuracy += prediction_metric.accuracy * prediction_metric.prevalence_count
        
        combined_prevalance = sum([prediction_metric.prevalence_count for prediction_metric in prediction_metrics])
        if combined_prevalance:
            combined_accuracy /= combined_prevalance
        return combined_accuracy
    

    @staticmethod
    def calculate_overall_consistency(prediction_metrics: List[PredictionMetric]) -> float:
        """Takes the consistency of each prediction_metric, weights it according to its prevelance. And combines the consistency"""
        combined_kappa = 0
        for prediction_metric in prediction_metrics:
            combined_kappa += prediction_metric.kappa * prediction_metric.prevalence_count
        
        combined_prevalance = sum([prediction_metric.prevalence_count for prediction_metric in prediction_metrics])
        if combined_prevalance:
            combined_kappa /= combined_prevalance
        return combined_kappa
    
    
    @staticmethod
    def calculate_prediction_metrics(experiment_entity: ExperimentEntity,
                                     sample_entity: SampleEntity,
                                     user_threshold: Optional[int] = None) -> List[PredictionMetric]:
        total_prediction_metrics: PredictionMetric = []
        for prediction_result_variable_name in experiment_entity.aggregate_result.field_names():
            
            prediction_metric = ExperimentService.calculate_single_prediction_metric(experiment_entity=experiment_entity,
                                                                                     prediction_result_variable_name=prediction_result_variable_name,
                                                                                     sample_entity=sample_entity,
                                                                                     user_threshold=user_threshold)
            
            total_prediction_metrics.append(prediction_metric)
        
        return total_prediction_metrics
            
    
    @staticmethod
    def calculate_total_times_predicted(prediction_result: PredictionResult):
        """
        calculates how often an LLM predicted this category to be true from the prevelance dict e.g.
        {"3": 120, "2": 40, "1": 10, "0": 100}
        becomes 3 *120 + 2 * 40 + 1 * 10 + 0 * 100 = 450 times LLM model predicted true

        the max is number_of_runs * sample_size
        """
        total_times_predicted = 0
        for runs_predicted_true_count, occurences in prediction_result.prevelance_distribution.items():
            total_times_predicted += int(runs_predicted_true_count) * int(occurences)
        
        return total_times_predicted

    @staticmethod
    def calculate_single_prediction_metric(experiment_entity: ExperimentEntity, 
                                           prediction_result_variable_name: str,
                                           sample_entity: SampleEntity,
                                           user_threshold: Optional[int] = None) -> PredictionMetric:
        """calculates everything that is needed for the prediction metric to be created and returns that"""
        if user_threshold is None:
            user_threshold = math.ceil(experiment_entity.runs_per_unit/2)
        prediction_result: PredictionResult = getattr(experiment_entity.aggregate_result, prediction_result_variable_name)
        total_times_predicted = ExperimentService.calculate_total_times_predicted(prediction_result)
        total_sample_runs = sample_entity.sample_size * experiment_entity.runs_per_unit
        
        confusion_matrix = ExperimentService.calculate_confusion_matrix(prediction_result=prediction_result,
                                                                        user_threshold=user_threshold,
        )
                                               
        prediction_metric = PredictionMetric(prediction_category_name=prediction_result_variable_name, 
                                              prevalence_count=total_times_predicted,
                                              prevalence=total_times_predicted/total_sample_runs,
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
            predicted_true = True if prediction_cluster_unit.runs_predicted_true >= user_threshold else False 
            if predicted_true and prediction_cluster_unit.ground_truth:
                true_positives += 1
            elif predicted_true and not prediction_cluster_unit.ground_truth:
                false_positives += 1
            elif not predicted_true and not prediction_cluster_unit.ground_truth:
                true_negatives += 1
            else:
                false_negatives += 1
        
        return ConfusionMatrix(
            tp=true_positives,
            fp=false_positives,
            tn=true_negatives,
            fn=false_negatives

        )

        # true_total = prediction_result.sum_ground_truth
        # false_total = sample_size - prediction_result.sum_ground_truth
        # true_predicted = sum([count
        #                        for runs_true, count 
        #                        in prediction_result.prevelance_distribution.items() 
        #                        if runs_true >= user_threshold])
        # false_predicted = sum([count
        #                        for runs_true, count 
        #                        in prediction_result.prevelance_distribution.items() 
        #                        if runs_true < user_threshold])
        
        # if (true_predicted + false_predicted) != (true_total + false_total):
        #     raise Exception("trues_predicted + falses_predicted) != (trues + falses")
        
            
                                              
        
    
    

# Test function to verify the prediction workflow
if __name__ == "__main__":
    from app.database.entities.base_entity import PyObjectId
    from bson import ObjectId

    print("Testing ExperimentService.predict_single_cluster_unit...")

    # Create mock entities for testing
    experiment_entity = ExperimentEntity(
        id=PyObjectId(ObjectId()),
        user_id=PyObjectId(ObjectId()),
        scraper_cluster_id=PyObjectId(ObjectId()),
        prompt_id=PyObjectId(ObjectId()),
        sample_id=PyObjectId(ObjectId()),
        model="gpt-4o-mini",  # Use a smaller model for testing
        runs_per_unit=2,  # Only 2 runs for testing
        aggregate_result=None
    )

    prompt_entity = PromptEntity(
        id=PyObjectId(ObjectId()),
        created_by_user_id=PyObjectId(ObjectId()),
        category=PromptCategory.Classify_cluster_units,
        system_prompt="""You are a Reddit comment classifier. Analyze the comment and classify it into categories.
Return your response as valid JSON with this structure:
{
    "labels": {
        "problem_description": true/false,
        "frustration_expression": true/false,
        "solution_seeking": true/false,
        "solution_attempted": true/false,
        "solution_proposing": true/false,
        "agreement_empathy": true/false,
        "none_of_the_above": true/false
    },
    "reason": "Brief explanation of classification",
    "sentiment": "negative/neutral/positive"
}""",
        prompt="""Thread context: {{conversation_thread}}

Final message to classify: {{final_reddit_message}}

Classify this message according to the categories defined in the system prompt.""",
        public_policy=True,
    )

    cluster_unit_entity = ClusterUnitEntity(
        id=PyObjectId(ObjectId()),
        cluster_entity_id=PyObjectId(ObjectId()),
        post_id=PyObjectId(ObjectId()),
        comment_post_id=PyObjectId(ObjectId()),
        type="comment",
        reddit_id="test123",
        author="test_user",
        usertag=None,
        upvotes=5,
        downvotes=0,
        created_utc=1234567890,
        thread_path_text=["Original post: My laptop keeps crashing", "Reply: Have you tried updating drivers?"],
        enriched_comment_thread_text=None,
        text="Yes I tried that but it still crashes during renders. So frustrated!",
        subreddit="techsupport",
        ground_truth=ClusterUnitEntityCategory(
            solution_attempted=True,
            frustration_expression=True
        ),
        predicted_category=None,
        total_nested_replies=0
    )

    try:
        # Test the prediction
        print(f"\nMaking {experiment_entity.runs_per_unit} prediction runs...")
        print(f"Model: {experiment_entity.model}")
        print(f"Comment text: {cluster_unit_entity.text[:100]}...")

        result = ExperimentService.predict_single_cluster_unit(
            experiment_entity,
            cluster_unit_entity,
            prompt_entity
        )

        print(f"\n✓ Test completed successfully!")
        print(f"Received {len(result)} predictions")
        print(f"\nPredictions:")
        for i, pred in enumerate(result, 1):
            print(f"\nRun {i}:")
            print(pred)

    except Exception as e:
        print(f"\n✗ Test failed with error:")
        print(f"Error type: {type(e).__name__}")
        print(f"Error message: {str(e)}")
        import traceback
        traceback.print_exc()