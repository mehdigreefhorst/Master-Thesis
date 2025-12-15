# LLMService

import json
from typing import Dict, Optional
from app.database import get_user_repository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import PredictionCategoryTokens, TokenUsageAttempt
from app.database.entities.experiment_entity import ExperimentEntity
from app.database.entities.label_template import LabelTemplateEntity
from app.database.entities.user_entity import UserEntity
from app.utils.llm_helper import LlmHelper
from app.utils.rate_limiters import call_with_retry


from app.utils.logging_config import get_logger

# Initialize loggers for this module
logger = get_logger(__name__)
llm_logger = get_logger('app.llm')

class LLMService:
    """service that handles how the LLM is called. With focus towards payment and billing"""

    @staticmethod
    async def send_to_model(open_router_api_key: str, system_prompt: str, prompt: str, model: str, reasoning_effort: Optional[str]):
         # :TODO add a elif for user wanting to pay for the usage, then we use our own API key
        llm_logger.info(
            f"Sending request to model with retry support",
            extra={
                'extra_fields': {
                    'model': model,
                    'reasoning_effort': reasoning_effort,
                    'has_system_prompt': bool(system_prompt),
                    'has_user_prompt': bool(prompt)
                }
            }
        )
        response = await call_with_retry(LlmHelper().async_send_to_openrouter,
                                         system_prompt=system_prompt,
            prompt=prompt,
            model=model,
            open_router_api_key=open_router_api_key,
            reasoning_effort=reasoning_effort)

        llm_logger.info("Model request completed successfully")
        return response

    @staticmethod
    def extract_tokens_from_response(response) -> Dict:
        """
        Safely extract token usage from any response, even if response is malformed.
        This should NEVER fail - it's the first thing we do after getting a response.
        """
        try:
            token_usage = LlmHelper.get_llm_usage(response)
            llm_logger.debug(
                f"Extracted token usage from response",
                extra={
                    'extra_fields': {
                        'token_usage': token_usage
                    }
                }
            )
            return token_usage
        except Exception as e:
            llm_logger.error(f"Failed to extract token usage from response: {e}", exc_info=True)
            # Return empty dict rather than failing - at least we tried
            return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "error": str(e)}

    @staticmethod
    def response_to_prediction_tokens_before_template(response, all_attempts: list[TokenUsageAttempt] = None) -> PredictionCategoryTokens:
        """
        Parse response into prediction. This may fail if format is incorrect.
        Token tracking happens BEFORE this is called, so tokens are never lost.

        Args:
            response: The LLM response object
            all_attempts: List of all token usage attempts (including retries) for this prediction
        """
        if all_attempts is None:
            all_attempts = []

        # Extract tokens from this successful response
        token_usage: Dict[str, str] = LLMService.extract_tokens_from_response(response)

        # Parse the response content (this is what might fail)
        try:
            response_dict = json.loads(response.choices[0].message.content)
            llm_logger.debug(
                "Parsed LLM response successfully",
                extra={
                    'extra_fields': {
                        'response_keys': list(response_dict.keys()),
                        'num_attempts': len(all_attempts)
                    }
                }
            )
        except json.JSONDecodeError as e:
            llm_logger.error(
                f"Failed to parse LLM response as JSON: {e}",
                extra={
                    'extra_fields': {
                        'response_content_preview': response.choices[0].message.content[:200] if hasattr(response, 'choices') else 'N/A'
                    }
                },
                exc_info=True
            )
            raise

        # First we create a labels response dict
        labels = {category: True for category in response_dict.pop("labels")}
        # Now get the prediction_reason & sentiment & possibly other key value pairs
        labels.update(response_dict)

        # Calculate total tokens across all attempts
        total_tokens_all_attempts = LLMService._aggregate_token_usage(all_attempts)

        llm_logger.info(
            "Created prediction tokens",
            extra={
                'extra_fields': {
                    'num_labels': len([k for k in labels.keys() if isinstance(labels[k], bool)]),
                    'total_tokens': total_tokens_all_attempts.get('total_tokens', 0),
                    'num_attempts': len(all_attempts)
                }
            }
        )

        prediction_category_tokens = PredictionCategoryTokens(
            **labels,
            tokens_used=token_usage,
            all_attempts=all_attempts,
            total_tokens_all_attempts=total_tokens_all_attempts
        )
        return prediction_category_tokens
    

    @staticmethod
    def response_to_prediction_tokens(response, experiment_entity: ExperimentEntity, label_template_entity: LabelTemplateEntity, all_attempts: list[TokenUsageAttempt] = None) -> PredictionCategoryTokens:
        """
        Parse response into prediction. This may fail if format is incorrect.
        Token tracking happens BEFORE this is called, so tokens are never lost.

        Args:
            response: The LLM response object
            all_attempts: List of all token usage attempts (including retries) for this prediction
        """
        if all_attempts is None:
            all_attempts = []

        # Extract tokens from this successful response
        token_usage: Dict[str, str] = LLMService.extract_tokens_from_response(response)

        # Parse the response content (this is what might fail)
        try:
            response_dict = json.loads(response.choices[0].message.content)
            llm_logger.debug(
                "Parsed LLM response for experiment",
                extra={
                    'extra_fields': {
                        'experiment_id': str(experiment_entity.id),
                        'response_keys': list(response_dict.keys()),
                        'num_attempts': len(all_attempts)
                    }
                }
            )
        except json.JSONDecodeError as e:
            llm_logger.error(
                f"Failed to parse LLM response as JSON: {e}",
                extra={
                    'extra_fields': {
                        'experiment_id': str(experiment_entity.id),
                        'response_content_preview': response.choices[0].message.content[:200] if hasattr(response, 'choices') else 'N/A'
                    }
                },
                exc_info=True
            )
            raise

        label_prediction = label_template_entity.from_prediction(llm_response_dict=response_dict, experiment_id=experiment_entity.id)


        # Calculate total tokens across all attempts
        total_tokens_all_attempts = LLMService._aggregate_token_usage(all_attempts)

        llm_logger.info(
            "Created prediction tokens with template",
            extra={
                'extra_fields': {
                    'experiment_id': str(experiment_entity.id),
                    'total_tokens': total_tokens_all_attempts.get('total_tokens', 0),
                    'num_attempts': len(all_attempts)
                }
            }
        )

        prediction_category_tokens = PredictionCategoryTokens(
            label_prediction=label_prediction,
            tokens_used=token_usage,
            all_attempts=all_attempts,
            total_tokens_all_attempts=total_tokens_all_attempts
        )
        return prediction_category_tokens

    @staticmethod
    def _aggregate_token_usage(attempts: list[TokenUsageAttempt]) -> Dict[str, int]:
        """Aggregate token usage across multiple attempts"""
        aggregated = {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }

        for attempt in attempts:
            for key in ["prompt_tokens", "completion_tokens", "total_tokens"]:
                aggregated[key] += attempt.tokens_used.get(key, 0)

        return aggregated
    

    @staticmethod
    def get_user_open_router_api_key(user_id: PyObjectId) -> str | None:
        user_entity: UserEntity =  get_user_repository().find_by_id(user_id)

        if user_entity.open_router_api_key:
            return user_entity.open_router_api_key

