

from app.database import get_user_repository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.user_entity import UserEntity
from app.utils.llm_helper import LlmHelper


class LLMService:
    """service that handles how the LLM is called. With focus towards payment and billing"""

    @staticmethod
    def send_to_model(user_id: PyObjectId, system_prompt: str, prompt: str, model: str):
        user_entity: UserEntity =  get_user_repository().find_by_id(user_id)
        if user_entity.open_router_api_key:
            return LlmHelper().send_to_openrouter(system_prompt=system_prompt,
                                                  prompt=prompt,
                                                  model=model,
                                                  open_router_api_key=user_entity.open_router_api_key)
        else:
            # :TODO add a elif for user wanting to pay for the usage, then we use our own API key
            raise Exception("No api key has been set by the user")