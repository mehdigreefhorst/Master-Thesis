

import json
import os

from openai import OpenAI


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
    def send_to_openrouter(system_prompt: str, prompt:str, model: str, open_router_api_key: str):
        llm = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=open_router_api_key)
        model_name =model
        messages = [
          {'role': 'system', 'content': system_prompt},
          {'role': 'user', 'content': prompt} ]
        response = llm.chat.completions.create(
                    model=model_name,
                    messages=messages)
        return response