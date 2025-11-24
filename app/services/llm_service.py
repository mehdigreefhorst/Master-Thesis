# LLMService

import json
import logging
from typing import Dict, Optional
from app.database import get_user_repository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import PredictionCategoryTokens, TokenUsageAttempt
from app.database.entities.user_entity import UserEntity
from app.utils.llm_helper import LlmHelper
from app.utils.rate_limiters import call_with_retry

logger = logging.getLogger(__name__)


class LLMService:
    """service that handles how the LLM is called. With focus towards payment and billing"""

    @staticmethod
    async def send_to_model(user_id: PyObjectId, system_prompt: str, prompt: str, model: str, reasoning_effort: Optional[str]):
        user_entity: UserEntity =  get_user_repository().find_by_id(user_id)
        if not user_entity.open_router_api_key:
            raise Exception("No API key has been set by the user")
         # :TODO add a elif for user wanting to pay for the usage, then we use our own API key
        response = await call_with_retry(LlmHelper().async_send_to_openrouter,
                                         system_prompt=system_prompt,
            prompt=prompt,
            model=model,
            open_router_api_key=user_entity.open_router_api_key,
            reasoning_effort=reasoning_effort)


        return response

    @staticmethod
    def extract_tokens_from_response(response) -> Dict:
        """
        Safely extract token usage from any response, even if response is malformed.
        This should NEVER fail - it's the first thing we do after getting a response.
        """
        try:
            return LlmHelper.get_llm_usage(response)
        except Exception as e:
            logger.error(f"Failed to extract token usage from response: {e}")
            # Return empty dict rather than failing - at least we tried
            return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0, "error": str(e)}

    @staticmethod
    def response_to_prediction_tokens(response, all_attempts: list[TokenUsageAttempt] = None) -> PredictionCategoryTokens:
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
        response_dict = json.loads(response.choices[0].message.content)

        # First we create a labels response dict
        labels = {category: True for category in response_dict.pop("labels")}
        # Now get the prediction_reason & sentiment & possibly other key value pairs
        labels.update(response_dict)

        # Calculate total tokens across all attempts
        total_tokens_all_attempts = LLMService._aggregate_token_usage(all_attempts)

        prediction_category_tokens = PredictionCategoryTokens(
            **labels,
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

