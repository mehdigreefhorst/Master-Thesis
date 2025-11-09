

import json
from typing import Dict, List, Optional

from pydantic import BaseModel
from app.database.entities.cluster_unit_entity import ClusterUnitEntityPredictedCategory, PredictionCategory, PredictionCategoryTokens, ClusterUnitEntity, ClusterUnitEntityCategory
from app.database import get_cluster_unit_repository, get_experiment_repository
from app.database.entities.experiment_entity import AggregateResult, ExperimentEntity, PredictionResult, PrevelanceUnitDistribution
from app.database.entities.prompt_entity import PromptCategory, PromptEntity
from app.database.entities.sample_entity import SampleEntity
from app.responses.get_experiments_response import ConfusionMatrix, GetExperimentsResponse, PredictionMetric
from app.utils.llm_helper import LlmHelper
from collections import defaultdict
import math


class ExperimentService:
    """This class is all about creating experiments with a limited amount of cluster units. sending them to an LLM with the respective prompt"""

    @staticmethod
    def predict_categories_cluster_units(experiment_entity: ExperimentEntity, cluster_unit_entities: List[ClusterUnitEntity], prompt_entity: PromptEntity):
        """this function orchestrates the prediction of the cluster unit entity and propagates it into the experiement entity"""
        if not prompt_entity.category == PromptCategory.Classify_cluster_units:
            raise Exception("The prompt is of the wrong type!!!")
        
        for cluster_unit_entity in cluster_unit_entities:
            predicted_categories = ExperimentService.predict_single_cluster_unit(experiment_entity,
                                                          cluster_unit_entity,
                                                          prompt_entity)
            
            cluster_unit_predicted_categories = ClusterUnitEntityPredictedCategory(
                experiment_id=experiment_entity.id,
                predicted_categories=predicted_categories
                )
            
            if cluster_unit_entity.predicted_category is None:
                cluster_unit_entity.predicted_category = {experiment_entity.id: cluster_unit_predicted_categories}
            else:
                cluster_unit_entity.predicted_category[experiment_entity.id] = cluster_unit_predicted_categories
            
            get_cluster_unit_repository().insert_predicted_category(cluster_unit_entity.id, experiment_entity.id, cluster_unit_predicted_categories)

        return ExperimentService.convert_total_predicted_into_aggregate_results(cluster_unit_entities, experiment_entity)
    





        
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
        print(f"the new experiment entity looks like : {experiment_entity.model_dump_json(indent=4)}")
        return get_experiment_repository().update(experiment_entity.id, experiment_entity).modified_count


    @staticmethod
    def create_prediction_counter_from_cluster_unit(cluster_unit_entity: ClusterUnitEntity, experiment_entity: ExperimentEntity) -> Dict[str, int]:
        """counts how often each of the classes in the prediction category are true accross the runs of the prediction. 
        Works in a way that allows for changing of the prediction category variables or naming"""
        prediction_counter = defaultdict(int)
        for prediction_category in cluster_unit_entity.predicted_category[experiment_entity.id].predicted_categories:
            for variable_name in prediction_category.category_field_names(): 
                print("variable_name = ", variable_name)
                value = getattr(prediction_category, variable_name)
                prediction_counter[variable_name] += 1 if value else 0
        return prediction_counter

    
    @staticmethod
    def predict_single_cluster_unit(experiment_entity: ExperimentEntity, cluster_unit_entity: ClusterUnitEntity, prompt_entity: PromptEntity):
        if not prompt_entity.category == PromptCategory.Classify_cluster_units:
            raise Exception("The prompt is of the wrong type!!!")
        parsed_prompt = ExperimentService.parse_classification_prompt(cluster_unit_entity, prompt_entity)
        category_predictions: List[PredictionCategoryTokens] = []
        for run in range(experiment_entity.runs_per_unit):
            if "gpt" in experiment_entity.model:
                response = LlmHelper.send_to_openai(prompt_entity.system_prompt, parsed_prompt, experiment_entity.model)
                response_dict = json.loads(response.choices[0].message.content)
                labels = {category: True for category in response_dict.pop("labels")}
                labels.update(response_dict)
                token_usage = response.usage.to_dict()
                category_prediction_tokens = PredictionCategoryTokens(**labels, tokens_used=token_usage)
                category_predictions.append(category_prediction_tokens)
            else:
                raise Exception("Wrong model is given, no implementation yet made for any other than openAI")
        print(category_predictions)
        return category_predictions
    

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
                                                         prediction_metrics=prediction_metrics)
            
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