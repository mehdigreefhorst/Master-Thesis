# LLMhelper

import json
import os
from typing import Optional
import logging
from openai import OpenAI, AsyncOpenAI

from app.utils.rate_limiters import RateLimitConfig, RateLimiterRegistry

logger = logging.getLogger(__name__)

class LlmHelper:

    @staticmethod
    def custom_formatting(prompt: str, **kwargs):
        for key, value in kwargs.items():
            if isinstance(value, list):
                value = json.dumps(value, ensure_ascii=False)
            else:
                value = value
            # prompt = prompt.replace(f'{{{key}}}', value)
            prompt = prompt.replace("{{key}}".replace("key", key), value)
        return prompt
    

    @staticmethod
    def send_to_openai(system_prompt: str, prompt:str, model: str):
        llm = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        model_name =model
        messages = [
          {'role': 'system', 'content': system_prompt},
          {'role': 'user', 'content': prompt} ]
        response = llm.chat.completions.create(
                    model=model_name,
                    messages=messages)
        return response
    

    @staticmethod
    def send_to_openrouter(system_prompt: str, prompt:str, model: str, open_router_api_key: str, reasoning_effort: Optional[str]):
        llm = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=open_router_api_key)
        model_name =model
        messages = [
          {'role': 'system', 'content': system_prompt},
          {'role': 'user', 'content': prompt} ]
        if reasoning_effort: 
            response = llm.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        reasoning_effort=reasoning_effort)
        else:
            response = llm.chat.completions.create(
                        model=model_name,
                        messages=messages
            )
        return response
    

    @staticmethod
    async def async_send_to_openrouter(
        system_prompt: str, 
        prompt:str, 
        model: str, 
        open_router_api_key: str, 
        reasoning_effort: Optional[str],
        requests_per_minute: Optional[int] = 1000,
        burst_capacity: Optional[int]=25,
        skip_rate_limit: bool = False  # For testing or priority requests
        ):
        # Get or create rate limiter for this API key
        # This returns the SAME rate limiter instance for all coroutines using this API key
        if not skip_rate_limit:
            config = RateLimitConfig(
                requests_per_minute=requests_per_minute,  # Adjust based on your OpenRouter plan
                burst_capacity=burst_capacity
            )
            rate_limiter = RateLimiterRegistry.get_limiter(open_router_api_key, config)
            
            # Wait for our turn (all coroutines coordinate here)
            wait_time = await rate_limiter.acquire()
            if wait_time > 0.1:  # Log significant waits
                logger.info(f"Rate limited for {wait_time:.2f}s before making request")
        # Now make the actual API call
        try:
            # Now make the actual API call
            llm = AsyncOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=open_router_api_key)
            messages = [
              {'role': 'system', 'content': system_prompt},
              {'role': 'user', 'content': prompt} ]
            
            kwargs = {
                    'model': model,
                    'messages': messages
                }
            if reasoning_effort:
                    kwargs['reasoning_effort'] = reasoning_effort
            response =  await llm.chat.completions.create(**kwargs)
            return response
        except Exception as e:
            logger.error(f"Error calling OpenRouter: {e}")
            raise e
       
         