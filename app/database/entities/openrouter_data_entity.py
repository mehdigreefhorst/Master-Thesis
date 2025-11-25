

from datetime import datetime
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel

from app.database.entities.base_entity import BaseEntity

# Supported parameters literal type
SupportedParameter = Literal[
    'frequency_penalty',
    'include_reasoning',
    'logit_bias',
    'logprobs',
    'max_tokens',
    'min_p',
    'presence_penalty',
    'reasoning',
    'repetition_penalty',
    'response_format',
    'seed',
    'stop',
    'structured_outputs',
    'temperature',
    'tool_choice',
    'tools',
    'top_a',
    'top_k',
    'top_logprobs',
    'top_p',
    'verbosity',
    'web_search_options'
]

# Architecture types
InputModality = Literal['audio', 'file', 'image', 'text', 'video']
OutputModality = Literal['image', 'text']
Tokenizer = Literal[
    'Claude', 'Cohere', 'DeepSeek', 'GPT', 'Gemini', 'Grok',
    'Llama2', 'Llama3', 'Llama4', 'Mistral', 'Nova',
    'Other', 'Qwen', 'Qwen3', 'Router'
]
Modality = Literal['text+image->text', 'text+image->text+image', 'text->text']
InstructType = Literal[
    'airoboros', 'alpaca', 'chatml', 'code-llama', 'deepseek-r1',
    'deepseek-v3.1', 'gemma', 'llama3', 'mistral', 'none',
    'phi3', 'qwen3', 'qwq', 'vicuna'
]


class Architecture(BaseModel):
    input_modalities: List[InputModality]
    output_modalities: List[OutputModality]
    tokenizer: Tokenizer
    modality: Modality
    instruct_type: Optional[InstructType] = None


class DefaultParameters(BaseModel):
    frequency_penalty: Optional[float] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None


class Pricing(BaseModel):
    completion: Optional[str] = None
    prompt: Optional[str] = None
    request: Optional[str] = None
    image: Optional[str] = None
    web_search: Optional[str] = None
    internal_reasoning: Optional[str] = None
    input_cache_read: Optional[str] = None
    input_cache_write: Optional[str] = None
    audio: Optional[str] = None
    


class TopProvider(BaseModel):
    context_length: Optional[int] = None
    is_moderated: bool
    max_completion_tokens: Optional[int] = None


class DevApiModel(BaseModel):
    """Schema for a single model from OpenRouter dev API"""
    id: str
    name: str
    canonical_slug: str
    created: int
    description: str
    context_length: int
    architecture: Architecture
    pricing: Pricing
    top_provider: TopProvider
    supported_parameters: List[SupportedParameter]
    default_parameters: Optional[DefaultParameters] = None
    hugging_face_id: Optional[str] = None
    per_request_limits: Optional[Dict] = None


class OpenRouterDataEntity(BaseEntity):
    """Entity to cache data from OpenRouter's official frontend and dev APIs"""
    public_api_data: Dict[Literal["models", "analytics", "categories"], Dict | List]  # Frontend API data
    dev_api_data: List[DevApiModel]  # All models from OpenRouter /models route (raw dict for flexibility)
    date_added: str = datetime.now().strftime("%d-%m-%Y")
