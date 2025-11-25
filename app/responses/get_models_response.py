

from typing import List
from pydantic import BaseModel

from app.database.entities.openrouter_data_entity import DevApiModel
from app.services.openrouter_analytics_service import ModelPricing


class GetModelsResponse(BaseModel):
    id: str
    name: str
    provider: str   #    // e.g., "OpenAI", "Anthropic", "Google"
    pricing: ModelPricing
    max_context: int#    // Maximum context window in tokens
    supports_reasoning: bool = False#: boolean;
    description: str
    free_available: bool

    @classmethod
    def from_model_entity(cls, models: List[DevApiModel]) -> List["GetModelsResponse"]:
        return [cls(id=model.id,
             name=model.name,
             provider=model.id.split("/")[0],
             pricing=model.pricing.model_dump(),
             max_context=model.context_length,
             supports_reasoning="reasoning" in model.supported_parameters,
             description=model.description,
             free_available="free" in model.id).model_dump()
         for model in models]