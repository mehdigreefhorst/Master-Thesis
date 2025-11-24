

import random
from typing import List
import os
from typing import Dict, List, Literal, Optional
from pydantic import BaseModel
from collections import defaultdict
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np

import requests
from app.database import get_openrouter_data_repository
from app.database.entities.openrouter_data_entity import OpenRouterDataEntity

def generate_random_color():
    """Generate a random RGB color as a string"""
    return f'rgb({random.randint(0, 255)}, {random.randint(0, 255)}, {random.randint(0, 255)})'


class OpenRouterCaching:

    def get_models_standard_dev_api():
    
        url = "https://openrouter.ai/api/v1/models"

        openrouter_dev_api_data = requests.get(url).json()

        return openrouter_dev_api_data

    @staticmethod
    def get_analytics_openrouter(order_param: Optional[Literal[
                                                          "latency-low-to-high",
                                                          "throughput-high-to-low",
                                                          "context-high-to-low",
                                                          "pricing-high-to-low",
                                                          "pricing-low-to-high",
                                                          "top-weekly",
                                                          "newest"  
                                                            ]] = None) -> Dict:
        """ returns the frontend json of the usage statistics of the models on openrouter
        
        returns dict with values ['models', 'analytics', 'categories']
        
        the analytics dictionary is what is super useful data about usage
        
        categories returns the top 10 models for that usage category. Such as legal, classification, 
        based on usage from other openrouter users
        
        models is similar to what you see from the get_all_models route from the official api"""
        if order_param is not None:
            response = requests.get(f"https://openrouter.ai/api/frontend/models/find?order={order_param}")
        else:
            response = requests.get(f"https://openrouter.ai/api/frontend/models/find")

        openrouter_public_api_data = response.json()
        return openrouter_public_api_data

    @staticmethod
    def get_cached_or_todays() -> OpenRouterDataEntity:
        openrouter_data_entity = get_openrouter_data_repository().find_of_today()
        if not openrouter_data_entity:
            openrouter_public_api_data = OpenRouterCaching.get_analytics_openrouter()["data"]
            openrouter_dev_api_data = OpenRouterCaching.get_models_standard_dev_api()["data"]
            openrouter_data_entity = OpenRouterDataEntity(public_api_data=openrouter_public_api_data,
                                                          dev_api_data=openrouter_dev_api_data)
            get_openrouter_data_repository().insert(openrouter_data_entity)
        
        return openrouter_data_entity

class ModelPricing(BaseModel):
    """ information from each of the model relating to its pricing cost"""
    prompt: float
    completion: float
    request: Optional[float] = 0
    image: Optional[float] = 0
    web_search: Optional[float] = 0
    internal_reasoning: Optional[float] = 0


class ModelData(BaseModel):
    model_id: str
    total_tool_calls: int
    tool_call_errors: int
    total_completion_tokens: int
    total_prompt_tokens: int
    total_native_reasoning_tokens: int
    pricing: ModelPricing
    times_used: int
    free_available: bool = False
    
    def total_tokens_used(self):
        return self.total_completion_tokens + self.total_native_reasoning_tokens + self.total_prompt_tokens
    
    def total_completion_spend(self):
        return self.total_completion_tokens * self.pricing.completion
    
    def total_reasoning_spend(self):
        return self.total_native_reasoning_tokens * self.pricing.internal_reasoning
    
    def total_prompt_spend(self):
        return self.total_prompt_tokens * self.pricing.prompt
    
    def total_spend(self):
        return self.total_completion_spend() * self.total_reasoning_spend() + self.total_prompt_spend()
    
    def error_rate(self):
        if self.total_tool_calls == 0:
            return 0
        return self.tool_call_errors/self.total_tool_calls
    
    def model_provider(self):
        return self.model_id.split("/")[0]

    def model_name(self):
        return self.model_id.split("/")[-1]


class OpenRouterModelData(BaseModel):
    model_data: List[ModelData] = []

    @staticmethod
    def get_model_data_with_analytics():
        """
        {'id': 'allenai/olmo-3-32b-think',
        'canonical_slug': 'allenai/olmo-3-32b-think-20251121',
        'hugging_face_id': 'allenai/Olmo-3-32B-Think',
        'name': 'AllenAI: Olmo 3 32B Think',
        'created': 1763758276,
        'description': 'Olmo 3 32B Think is a large-scale, 32-billion-parameter model purpose-built for deep reasoning, complex logic chains and advanced instruction-following scenarios. Its capacity enables strong performance on demanding evaluation tasks and highly nuanced conversational reasoning. Developed by Ai2 under the Apache 2.0 license, Olmo 3 32B Think embodies the Olmo initiative’s commitment to openness, offering full transparency across weights, code and training methodology.',
        'context_length': 65536,
        'architecture': {'modality': 'text->text',
        'input_modalities': ['text'],
        'output_modalities': ['text'],
        'tokenizer': 'Other',
        'instruct_type': None},
        'pricing': {'prompt': '0.0000002',
        'completion': '0.00000035',
        'request': '0',
        'image': '0',
        'web_search': '0',
        'internal_reasoning': '0'},
        'top_provider': {'context_length': 65536,
        'max_completion_tokens': 65536,
        'is_moderated': False},
        'per_request_limits': None,
        'supported_parameters': ['frequency_penalty',
        'include_reasoning',
        'logit_bias',
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
        'top_k',
        'top_p'],
        'default_parameters': {'temperature': 0.6,
        'top_p': 0.95,
        'frequency_penalty': None},
        'analytics': {'date': '2025-11-21 00:00:00',
        'model_permaslug': 'allenai/olmo-3-32b-think-20251121',
        'variant': 'standard',
        'variant_permaslug': 'allenai/olmo-3-32b-think-20251121',
        'count': 26850,
        'total_completion_tokens': 59912743,
        'total_prompt_tokens': 38135902,
        'total_native_tokens_reasoning': 54764459,
        'num_media_prompt': 0,
        'num_media_completion': 0,
        'num_audio_prompt': 0,
        'total_native_tokens_cached': 22299584,
        'total_tool_calls': 0,
        'requests_with_tool_call_errors': 0}}
        """
        openrouter_data_entity = OpenRouterCaching().get_cached_or_todays()
        standard_api_response = openrouter_data_entity.dev_api_data
        model_analytics = openrouter_data_entity.public_api_data["analytics"]
        models_analytics_improved = []
        slug_counter = defaultdict(int)
        for index, model in enumerate(standard_api_response):
            slug = model["canonical_slug"]
            
            
            # We try here to link the frontend api to the backend api data format of the models. 
            # There are some issues, so we fixed those with trial and error as seen below
            # Janky but works 
            try:
                
                analytics = model_analytics[slug]
            except KeyError:
                if "google/gemini-2.5-pro" in  slug:
                    slug = "google/gemini-2.5-pro"
                elif "beta" in slug:
                    slug = slug.replace("-beta", "")
                # elif "x-ai/grok-3-mini" in slug:
                #     slug = "x-ai/grok-3-mini"
                # elif "x-ai/grok-3" in slug:
                #     slug = "x-ai/grok-3"
                
                elif "openrouter/auto" in slug:
                    continue
                else:
                    slug += ":free"
                    
                analytics = model_analytics[slug]
            
            finally:
                updated_model = model.copy()
                updated_model["analytics"] = analytics
                models_analytics_improved.append(updated_model)
                slug_counter[slug] +=1
                # if slug_counter[slug] >1:
                #     print(updated_model["id"])
        
        return models_analytics_improved
          
    @classmethod
    def from_api_data(cls, minimum_tool_calls: int = 1000, only_free_models: bool = None):
      """Create OpenRouterModelData from API responses"""      
      models_analytics_improved = OpenRouterModelData.get_model_data_with_analytics()
      model_data_error_rate: List[ModelData] = []
      print(len(models_analytics_improved))
      
      for model_data in models_analytics_improved:
        model = model_data["analytics"]
        model_has_free =  "free" in model_data["id"]
        # When we want to skip certain models skip the ones that are not part of the subset of interest 
        if (only_free_models is not None and model_has_free != only_free_models):
            continue
            

        if model.get("total_tool_calls") >= minimum_tool_calls:

            single_model_data = ModelData(
                model_id=model_data["id"],
                total_tool_calls=model["total_tool_calls"],  # total tool calls 
                total_completion_tokens=model["total_completion_tokens"], # completion tokens
                total_prompt_tokens=model["total_prompt_tokens"],  # prompt tokens
                total_native_reasoning_tokens=model["total_native_tokens_reasoning"], # reason tokens
                times_used=model["count"], # how often model been used
                pricing=model_data["pricing"], # Completion token price
                tool_call_errors=model["requests_with_tool_call_errors"],
                free_available= model_has_free
                )
            model_data_error_rate.append(single_model_data)
        else:
            print(model_data["id"])

        
      sorted_data = sorted(model_data_error_rate, key=lambda x: x.model_provider())
      return cls(model_data=sorted_data)
      
    def model_error_rates(self):
        return [model.error_rate() for model in self.model_data]
    
    def model_completion_prices(self, in_MTOK: bool = True):
        """MNOK = when to multiply the token cost times 1 million. To get $ per MTOK"""
        multiplyer = 1000000 if in_MTOK else 1
        
        return [model.pricing.completion*multiplyer for model in self.model_data]
    
    def model_total_tokens(self):
        return [model.total_tokens_used() for model in self.model_data]
    
    def model_model_names(self):
        return [model.model_name() for model in self.model_data]
    
    def model_ids(self):
        return [model.model_id for model in self.model_data]
    
    def model_providers(self, unique_set: bool = False):
        providers = [model.model_provider() for model in self.model_data]
        return set(providers) if unique_set else providers
    
    def model_tool_calls(self):
        return [model.total_tool_calls for model in self.model_data]
    
    def model_total_spend(self):
        return [model.total_spend() for model in self.model_data]
    
    def model_free_available(self):
        return [model.free_available for model in self.model_data]
    
    def total_count_used(self):
        return [model.times_used for model in self.model_data]
    
    def tokens_per_request(self):
        total_tokens = np.array(self.model_total_tokens())
        total_calls = np.array(self.total_count_used())
        return total_tokens/total_calls


class OpenRouterAnalyticsService:
    
    @staticmethod
    def create_figure_avg_tokens_vs_price(router_model: OpenRouterModelData):
        # Normalize error rates for bubble sizes (higher error = larger bubble to show problem areas)
        max_error = max(router_model.model_error_rates()) if router_model.model_error_rates() else 1
        normalized_sizes = [(e / max_error) * 50 + 10 for e in router_model.model_error_rates()]  # Scale for plotly

        # Figure: Interactive Average Tokens vs Completion Price
        fig8 = go.Figure()

        unique_provider_color_dict = {provider: generate_random_color()  
                                    for provider in router_model.model_providers(unique_set=True)}

        # Create a separate trace for each provider (for legend)
        for provider in sorted(unique_provider_color_dict.keys()):
            # Filter data for this provider
            provider_indices = [i for i, p in enumerate(router_model.model_providers()) if p == provider]
            
            fig8.add_trace(go.Scatter(
                x=[router_model.model_completion_prices()[i] for i in provider_indices],
                y=[router_model.tokens_per_request()[i] for i in provider_indices],
                mode='markers',
                marker=dict(
                    size=[normalized_sizes[i] for i in provider_indices],
                    color=unique_provider_color_dict[provider],
                    line=dict(color='white', width=2),
                    opacity=0.7
                ),
                text=[router_model.model_model_names()[i] for i in provider_indices],
                customdata=np.column_stack((
                    [router_model.model_total_tokens()[i] for i in provider_indices],
                    [router_model.model_tool_calls()[i] for i in provider_indices],
                    [router_model.model_error_rates()[i] for i in provider_indices],
                    [router_model.total_count_used()[i] for i in provider_indices],
                    [router_model.model_providers()[i] for i in provider_indices],  # Added provider
                    [router_model.model_ids()[i] for i in provider_indices]  # Add model_id here as customdata[5]
                )),
                hovertemplate='<b>%{text}</b><br>' +
                            'Provider: <b>%{customdata[4]}</b><br>' + 
                            'Completion Price: $%{x:,}<br>' +
                            'Avg Tokens per Request: %{y:,.0f}<br>' +
                            'Total Count: %{customdata[3]:,}<br>' +
                            'Total Tokens: %{customdata[0]:,}<br>' +
                            'Tool Calls: %{customdata[1]:,}<br>' +
                            'Error Rate: %{customdata[2]:.4f}<br>' +
                            '<extra></extra>',
                name=provider  # This creates the legend entry
            ))

        fig8.update_layout(
            title='Model Usage: Average Tokens per Request vs Completion Price<br><sub>Bubble size represents error rate | Color represents provider</sub>',
            xaxis_title='Completion price per M token ($)',
            yaxis_title='Average Tokens per Request',
            xaxis_type='log',
            yaxis_type='log',
            hovermode='closest',
            template='plotly_white',
            width=1400,
            height=900,
            font=dict(size=12),
            plot_bgcolor='#f8f9fa',
            showlegend=True
        )

        html_str = fig8.to_html(
            include_plotlyjs='cdn',
            div_id="plotly-div",
            config={'displayModeBar': True})
        
        # Inject custom JavaScript for React communication
        custom_js = """
        <script>
        document.addEventListener('DOMContentLoaded', function() {
            var plot = document.getElementById('plotly-div');
    
            // Handle single click
            plot.on('plotly_click', function(data) {
                var point = data.points[0];
                
                // Send only essential data
                window.parent.postMessage({
                    type: 'plotly-click',
                    modelId: point.customdata[5],  // Assuming you add model_id as customdata[5]
                    modelName: point.text,          // Model name from text field
                    provider: point.data.name       // Provider from trace name
                }, '*');
            });
            
        });
        </script>
        """
        
        return html_str.replace('</body>', custom_js + '</body>')

