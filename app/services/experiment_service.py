

import json
from typing import List
from app.database.entities.cluster_unit_entity import CategoryPrediction, CategoryPredictionTokens, ClusterUnitEntity, ClusterUnitEntityCategory
from app.database.entities.experiment_entity import ExperimentEntity
from app.database.entities.prompt_entity import PromptCategory, PromptEntity
from app.utils.llm_helper import LlmHelper


class ExperimentService:
    """This class is all about creating experiments with a limited amount of cluster units. sending them to an LLM with the respective prompt"""

    @staticmethod
    def predict_categories_cluster_units(experiment_entity: ExperimentEntity, cluster_unit_entities: List[ClusterUnitEntity], prompt_entity: PromptEntity):
        """this function orchestrates the prediction of the cluster unit entity and propagates it into the experiement entity"""
        if not prompt_entity.category == PromptCategory.Classify_cluster_units:
            raise Exception("The prompt is of the wrong type!!!")
        
        for cluster_unit_entity in cluster_unit_entities:
            ExperimentService.predict_single_cluster_unit(experiment_entity,
                                                          cluster_unit_entity,
                                                          prompt_entity)

    
    @staticmethod
    def predict_single_cluster_unit(experiment_entity: ExperimentEntity, cluster_unit_entity: ClusterUnitEntity, prompt_entity: PromptEntity):
        if not prompt_entity.category == PromptCategory.Classify_cluster_units:
            raise Exception("The prompt is of the wrong type!!!")
        parsed_prompt = ExperimentService.parse_classification_prompt(cluster_unit_entity, prompt_entity)
        category_predictions: List[CategoryPredictionTokens] = []
        for run in range(experiment_entity.runs_per_unit):
            if "gpt" in experiment_entity.model:
                response = LlmHelper.send_to_openai(prompt_entity.system_prompt, parsed_prompt, experiment_entity.model)
                response_dict = json.loads(response.choices[0].message.content)
                labels = response_dict.pop("labels")
                labels.update(response_dict)
                token_usage = response.usage.to_dict()
                category_prediction_tokens = CategoryPredictionTokens(**labels, tokens_used=token_usage)
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
        reasoning_effort=None
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