

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
from app.utils.logging_config import get_logger

# Initialize logger for this module
logger = get_logger(__name__)

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
        try:
            logger.debug(f"Fetching OpenRouter analytics (order: {order_param})")

            if order_param is not None:
                response = requests.get(f"https://openrouter.ai/api/frontend/models/find?order={order_param}")
            else:
                response = requests.get(f"https://openrouter.ai/api/frontend/models/find")

            response.raise_for_status()
            openrouter_public_api_data = response.json()

            logger.debug(f"Fetched analytics data successfully")
            return openrouter_public_api_data

        except requests.RequestException as e:
            logger.error(f"Failed to fetch OpenRouter analytics: {str(e)}", exc_info=True)
            raise

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
          
            slug = model.canonical_slug
            
            
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
                
                if slug in model_analytics:
                    
                    analytics = model_analytics[slug]
                else:
                    analytics = {
                        "total_tool_calls":0,
                        "total_completion_tokens":0,
                        "total_prompt_tokens":0,
                        "total_native_tokens_reasoning":0,
                        "count":0,
                        "requests_with_tool_call_errors":0
                    }
            
            finally:
                updated_model = model.model_dump()
                updated_model["analytics"] = analytics
                models_analytics_improved.append(updated_model)
                slug_counter[slug] +=1
                # if slug_counter[slug] >1:
                #     print(updated_model["id"])
        
        return models_analytics_improved
          
    @classmethod
    def from_api_data(cls, minimum_tool_calls: int = 1000, only_free_models: bool = None):
      """Create OpenRouterModelData from API responses"""
      logger.debug(f"Loading model data (min_tool_calls={minimum_tool_calls}, only_free={only_free_models})")

      models_analytics_improved = OpenRouterModelData.get_model_data_with_analytics()
      model_data_error_rate: List[ModelData] = []
      logger.debug(f"Processing {len(models_analytics_improved)} models")
      
      for model_data in models_analytics_improved:
        model_analytics = model_data["analytics"]
        model_has_free =  "free" in model_data["id"]
        # When we want to skip certain models skip the ones that are not part of the subset of interest 
        if (only_free_models is not None and model_has_free != only_free_models):
            continue
            

        if model_analytics.get("total_tool_calls") >= minimum_tool_calls:

            single_model_data = ModelData(
                model_id=model_data["id"],
                total_tool_calls=model_analytics["total_tool_calls"],  # total tool calls 
                total_completion_tokens=model_analytics["total_completion_tokens"], # completion tokens
                total_prompt_tokens=model_analytics["total_prompt_tokens"],  # prompt tokens
                total_native_reasoning_tokens=model_analytics["total_native_tokens_reasoning"], # reason tokens
                times_used=model_analytics["count"], # how often model been used
                pricing=model_data["pricing"], # Completion token price
                tool_call_errors=model_analytics["requests_with_tool_call_errors"],
                free_available= model_has_free
                )
            model_data_error_rate.append(single_model_data)


      sorted_data = sorted(model_data_error_rate, key=lambda x: x.model_provider())
      logger.debug(f"Filtered to {len(sorted_data)} models meeting criteria")
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
    def generate_all_figures() -> List[str]:
        """
        Generate all visualization figures for OpenRouter analytics.

        Returns:
            List of HTML strings for each figure
        """
        logger.info("Starting figure generation")

        try:
            # Fetch model data
            logger.debug("Fetching OpenRouter model data")
            openrouter_model = OpenRouterModelData.from_api_data()
            openrouter_model_free = OpenRouterModelData.from_api_data(only_free_models=True)

            logger.debug(
                "Model data loaded",
                extra={'extra_fields': {
                    'total_models': len(openrouter_model.model_data),
                    'free_models': len(openrouter_model_free.model_data)
                }}
            )

            # Generate all figures
            figures = [
                OpenRouterAnalyticsService.create_figure_error_vs_price(openrouter_model),
                OpenRouterAnalyticsService.create_figure_enhanced_analysis(openrouter_model),
                OpenRouterAnalyticsService.create_figure_performance_matrix(openrouter_model),
                OpenRouterAnalyticsService.create_figure_spend_vs_count(openrouter_model),
                OpenRouterAnalyticsService.create_figure_spend_vs_price(openrouter_model),
                OpenRouterAnalyticsService.create_figure_error_rate_vs_usage(openrouter_model),
                OpenRouterAnalyticsService.create_figure_error_rate_vs_usage(openrouter_model_free, "Free Models"),
                OpenRouterAnalyticsService.create_figure_avg_tokens_vs_price(openrouter_model)
            ]

            logger.info(f"Successfully generated {len(figures)} figures")
            return figures

        except Exception as e:
            logger.error(f"Figure generation failed: {str(e)}", exc_info=True)
            raise

    @staticmethod
    def _inject_react_communication_js(html_str: str) -> str:
        """Inject JavaScript for React iframe communication into Plotly HTML"""
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
                    modelId: point.customdata[5],
                    modelName: point.text,
                    provider: point.data.name
                }, '*');
            });

        });
        </script>
        """
        return html_str.replace('</body>', custom_js + '</body>')

    @staticmethod
    def _get_provider_colors(router_model: OpenRouterModelData) -> dict:
        """Generate consistent random colors for each provider"""
        return {provider: generate_random_color()
                for provider in router_model.model_providers(unique_set=True)}

    @staticmethod
    def create_figure_error_vs_price(router_model: OpenRouterModelData) -> str:
        """Figure 1: Error Rate vs Completion Price - bubble size = total tokens"""
        # Normalize token sizes for bubble sizes
        max_tokens = max(router_model.model_total_tokens()) if router_model.model_total_tokens() else 1
        normalized_sizes = [(t / max_tokens) * 50 + 10 for t in router_model.model_total_tokens()]

        fig = go.Figure()
        unique_provider_color_dict = OpenRouterAnalyticsService._get_provider_colors(router_model)

        for provider in sorted(unique_provider_color_dict.keys()):
            provider_indices = [i for i, p in enumerate(router_model.model_providers()) if p == provider]

            fig.add_trace(go.Scatter(
                x=[router_model.model_error_rates()[i] for i in provider_indices],
                y=[router_model.model_completion_prices()[i] for i in provider_indices],
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
                    [router_model.model_providers()[i] for i in provider_indices],
                    [0 for _ in provider_indices],  # placeholder
                    [router_model.model_providers()[i] for i in provider_indices],
                    [router_model.model_ids()[i] for i in provider_indices]
                )),
                hovertemplate='<b>%{text}</b><br>' +
                            'Provider: <b>%{customdata[2]}</b><br>' +
                            'Error Rate: %{x:.4f}<br>' +
                            'Price: $%{y}<br>' +
                            'Total Tokens: %{customdata[0]:,}<br>' +
                            'Tool Calls: %{customdata[1]:,}<br>' +
                            '<extra></extra>',
                name=provider
            ))

        fig.update_layout(
            title='Model Performance: Error Rate vs Price Analysis<br><sub>Bubble size represents total token usage</sub>',
            xaxis_title='Tool Calling Error Rate',
            yaxis_title='Completion Price per M Token ($)',
            xaxis_type='log',
            yaxis_type='log',
            hovermode='closest',
            template='plotly_white',
            width=1400,
            height=900,
            font=dict(size=12),
            plot_bgcolor='#f8f9fa'
        )

        html_str = fig.to_html(include_plotlyjs='cdn', div_id="plotly-div", config={'displayModeBar': False})
        return OpenRouterAnalyticsService._inject_react_communication_js(html_str)

    @staticmethod
    def create_figure_enhanced_analysis(router_model: OpenRouterModelData) -> str:
        """Figure 2: Enhanced visualization with log scale color for tool calls"""
        fig = go.Figure()

        # Normalize token sizes for bubble sizes
        max_tokens = max(router_model.model_total_tokens()) if router_model.model_total_tokens() else 1
        normalized_sizes = [(t / max_tokens) * 50 + 10 for t in router_model.model_total_tokens()]

        # Log scale for tool calls color
        tool_calls_all = router_model.model_tool_calls()
        log_tool_calls = [np.log10(max(tc, 1)) for tc in tool_calls_all]

        for idx, provider in enumerate(sorted(router_model.model_providers(unique_set=True))):
            provider_indices = [i for i, p in enumerate(router_model.model_providers()) if p == provider]

            fig.add_trace(go.Scatter(
                x=[router_model.model_error_rates()[i] for i in provider_indices],
                y=[router_model.model_completion_prices()[i] for i in provider_indices],
                mode='markers',
                marker=dict(
                    size=[normalized_sizes[i] for i in provider_indices],
                    color=[log_tool_calls[i] for i in provider_indices],
                    colorscale='RdYlBu_r',
                    showscale=(idx == 0),
                    colorbar=dict(
                        title="Tool Calls<br>(log scale)",
                        x=1.15,
                        xanchor='left',
                        len=0.7,
                        y=0.5,
                        yanchor='middle'
                    ),
                    line=dict(color='darkblue', width=1.5),
                    opacity=0.8,
                    cmin=min(log_tool_calls),
                    cmax=max(log_tool_calls)
                ),
                text=[router_model.model_model_names()[i] for i in provider_indices],
                customdata=np.column_stack((
                    [router_model.model_total_tokens()[i] for i in provider_indices],
                    [router_model.model_tool_calls()[i] for i in provider_indices],
                    [router_model.model_providers()[i] for i in provider_indices],
                    [0 for _ in provider_indices],
                    [router_model.model_providers()[i] for i in provider_indices],
                    [router_model.model_ids()[i] for i in provider_indices]
                )),
                hovertemplate='<b>%{text}</b><br>' +
                            'Provider: <b>%{customdata[2]}</b><br>' +
                            'Error Rate: %{x:.4f}<br>' +
                            'Price: $%{y:.6f}<br>' +
                            'Tool Calls: %{customdata[1]:,}<br>' +
                            'Total Tokens: %{customdata[0]:,}<br>' +
                            '<extra></extra>',
                name=provider,
                legendgroup=provider
            ))

        # Add reference lines
        if max(router_model.model_error_rates()) > 0:
            fig.add_vline(x=0.01, line_dash="dash", line_color="red", opacity=0.5,
                        annotation_text="1% error threshold", annotation_position="top")
            fig.add_vline(x=0.05, line_dash="dash", line_color="orange", opacity=0.5,
                        annotation_text="5% error threshold", annotation_position="top")

        fig.update_layout(
            title='Model Efficiency Dashboard: Multi-dimensional Analysis<br><sub>Bubble size: Total tokens | Color: Tool call frequency (log scale)</sub>',
            xaxis_title='Tool Calling Error Rate',
            yaxis_title='Completion Price per mil Token ($)',
            yaxis_type='log',
            xaxis_type='log',
            hovermode='closest',
            template='plotly_white',
            width=1400,
            height=900,
            font=dict(size=12),
            plot_bgcolor='#fafafa',
            showlegend=True,
            legend=dict(x=1.02, y=1, xanchor='left', yanchor='top',
                       bgcolor='rgba(255, 255, 255, 0.8)', bordercolor='black', borderwidth=1)
        )

        # Add stats annotation
        price_min = min(router_model.model_completion_prices())
        price_max = max(router_model.model_completion_prices())
        if price_max < 0.001:
            price_range_text = f"${price_min:.2e} - ${price_max:.2e}"
        elif price_max < 1:
            price_range_text = f"${price_min:.6f} - ${price_max:.6f}"
        else:
            price_range_text = f"${price_min:.4f} - ${price_max:.4f}"

        stats_text = (f"<b>Statistics:</b><br>"
                    f"Models analyzed: {len(router_model.model_model_names())}<br>"
                    f"Avg error rate: {np.mean(router_model.model_error_rates()):.4f}<br>"
                    f"Price range: {price_range_text}<br>"
                    f"Total tokens processed: {sum(router_model.model_total_tokens())/1e9:.2f}B")

        fig.add_annotation(text=stats_text, xref="paper", yref="paper",
                          x=0.02, y=0.98, showarrow=False, bgcolor="white",
                          bordercolor="black", borderwidth=1, xanchor='left', yanchor='top', align='left')

        html_str = fig.to_html(include_plotlyjs='cdn', div_id="plotly-div", config={'displayModeBar': False})
        return OpenRouterAnalyticsService._inject_react_communication_js(html_str)

    @staticmethod
    def create_figure_performance_matrix(router_model: OpenRouterModelData) -> str:
        """Figure 3: Performance Matrix with subplots"""
        fig = make_subplots(
            rows=1, cols=2,
            subplot_titles=('Error Rate by Model', 'Price vs Usage (Color: Error Rate)'),
            horizontal_spacing=0.12
        )

        # Left panel: Error rate distribution
        fig.add_trace(
            go.Bar(
                y=router_model.model_model_names(),
                x=router_model.model_error_rates(),
                orientation='h',
                marker=dict(
                    color=np.linspace(0, 1, len(router_model.model_error_rates())),
                    colorscale='Viridis',
                    line=dict(color='black', width=1)
                ),
                hovertemplate='<b>%{y}</b><br>Error Rate: %{x:.4f}<extra></extra>'
            ),
            row=1, col=1
        )

        # Right panel: Price vs Tokens scatter
        fig.add_trace(
            go.Scatter(
                x=router_model.model_total_tokens(),
                y=router_model.model_completion_prices(),
                mode='markers',
                marker=dict(
                    size=15,
                    color=router_model.model_error_rates(),
                    colorscale='RdYlGn_r',
                    showscale=True,
                    colorbar=dict(title="Error Rate", x=1.15),
                    line=dict(color='black', width=1)
                ),
                text=router_model.model_model_names(),
                hovertemplate='<b>%{text}</b><br>' +
                            'Total Tokens: %{x:,}<br>' +
                            'Price: $%{y:.2e}<br>' +
                            '<extra></extra>'
            ),
            row=1, col=2
        )

        fig.update_xaxes(title_text="Tool Calling Error Rate", row=1, col=1)
        fig.update_xaxes(title_text="Total Tokens Used", type="log", row=1, col=2)
        fig.update_yaxes(title_text="", row=1, col=1)
        fig.update_yaxes(title_text="Completion Price per mil Token ($)", type="log", row=1, col=2)

        fig.update_layout(
            title_text='Model Performance Analysis Suite<br><sub>Hover over elements to see details</sub>',
            showlegend=False,
            template='plotly_white',
            width=1600,
            height=800,
            font=dict(size=11),
            hovermode='closest'
        )

        html_str = fig.to_html(include_plotlyjs='cdn', div_id="plotly-div", config={'displayModeBar': False})
        return OpenRouterAnalyticsService._inject_react_communication_js(html_str)

    @staticmethod
    def create_figure_spend_vs_count(router_model: OpenRouterModelData) -> str:
        """Figure 4: Total Spend vs Total Count - bubble size = error rate"""
        max_error = max(router_model.model_error_rates()) if router_model.model_error_rates() else 1
        normalized_sizes = [(e / max_error) * 50 + 10 for e in router_model.model_error_rates()]

        fig = go.Figure()
        unique_provider_color_dict = OpenRouterAnalyticsService._get_provider_colors(router_model)

        for provider in sorted(unique_provider_color_dict.keys()):
            provider_indices = [i for i, p in enumerate(router_model.model_providers()) if p == provider]

            fig.add_trace(go.Scatter(
                x=[router_model.total_count_used()[i] for i in provider_indices],
                y=[router_model.model_total_spend()[i] for i in provider_indices],
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
                    [router_model.model_providers()[i] for i in provider_indices],
                    [router_model.model_providers()[i] for i in provider_indices],
                    [router_model.model_ids()[i] for i in provider_indices]
                )),
                hovertemplate='<b>%{text}</b><br>' +
                            'Provider: <b>%{customdata[3]}</b><br>' +
                            'Total Count: %{x:,}<br>' +
                            'Total Spend: $%{y:.4f}<br>' +
                            'Total Tokens: %{customdata[0]:,}<br>' +
                            'Tool Calls: %{customdata[1]:,}<br>' +
                            'Error Rate: %{customdata[2]:.4f}<br>' +
                            '<extra></extra>',
                name=provider
            ))

        fig.update_layout(
            title='Model Usage: Total Spend vs Total Count<br><sub>Bubble size represents error rate | Color represents provider</sub>',
            xaxis_title='Total Count (Number of Requests)',
            yaxis_title='Total Spend ($)',
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

        html_str = fig.to_html(include_plotlyjs='cdn', div_id="plotly-div", config={'displayModeBar': False})
        return OpenRouterAnalyticsService._inject_react_communication_js(html_str)

    @staticmethod
    def create_figure_spend_vs_price(router_model: OpenRouterModelData) -> str:
        """Figure 5: Total Spend vs Completion Price - bubble size = error rate"""
        max_error = max(router_model.model_error_rates()) if router_model.model_error_rates() else 1
        normalized_sizes = [(e / max_error) * 50 + 10 for e in router_model.model_error_rates()]

        fig = go.Figure()
        unique_provider_color_dict = OpenRouterAnalyticsService._get_provider_colors(router_model)

        for provider in sorted(unique_provider_color_dict.keys()):
            provider_indices = [i for i, p in enumerate(router_model.model_providers()) if p == provider]

            fig.add_trace(go.Scatter(
                x=[router_model.model_completion_prices()[i] for i in provider_indices],
                y=[router_model.model_total_spend()[i] for i in provider_indices],
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
                    [router_model.model_providers()[i] for i in provider_indices],
                    [router_model.model_ids()[i] for i in provider_indices]
                )),
                hovertemplate='<b>%{text}</b><br>' +
                            'Provider: <b>%{customdata[4]}</b><br>' +
                            'Completion Price: $%{x:,}<br>' +
                            'Total Spend: $%{y:.4f}<br>' +
                            'Total Count: %{customdata[3]:,}<br>' +
                            'Total Tokens: %{customdata[0]:,}<br>' +
                            'Tool Calls: %{customdata[1]:,}<br>' +
                            'Error Rate: %{customdata[2]:.4f}<br>' +
                            '<extra></extra>',
                name=provider
            ))

        fig.update_layout(
            title='Model Usage: Total Spend vs Completion Price<br><sub>Bubble size represents error rate | Color represents provider</sub>',
            xaxis_title='Completion price per M token ($)',
            yaxis_title='Total Spend ($)',
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

        html_str = fig.to_html(include_plotlyjs='cdn', div_id="plotly-div", config={'displayModeBar': False})
        return OpenRouterAnalyticsService._inject_react_communication_js(html_str)

    @staticmethod
    def create_figure_error_rate_vs_usage(router_model: OpenRouterModelData, add_title:str = "") -> str:
        """Figure 7: Error Rate vs Usage (Total Count) - bubble size = total count"""
        max_count = max(router_model.total_count_used()) if router_model.total_count_used() else 1
        normalized_sizes = [(s / max_count) * 50 + 10 for s in router_model.total_count_used()]

        fig = go.Figure()
        unique_provider_color_dict = OpenRouterAnalyticsService._get_provider_colors(router_model)

        for provider in sorted(unique_provider_color_dict.keys()):
            provider_indices = [i for i, p in enumerate(router_model.model_providers()) if p == provider]

            fig.add_trace(go.Scatter(
                x=[router_model.total_count_used()[i] for i in provider_indices],
                y=[router_model.model_error_rates()[i] for i in provider_indices],
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
                    [router_model.total_count_used()[i] for i in provider_indices],
                    [router_model.model_providers()[i] for i in provider_indices],
                    [router_model.model_providers()[i] for i in provider_indices],
                    [router_model.model_ids()[i] for i in provider_indices]
                )),
                hovertemplate='<b>%{text}</b><br>' +
                            'Provider: <b>%{customdata[3]}</b><br>' +
                            'Total Count: %{x:,}<br>' +
                            'Error Rate: %{y:.4f}<br>' +
                            'Total Tokens: %{customdata[0]:,}<br>' +
                            'Tool Calls: %{customdata[1]:,}<br>' +
                            '<extra></extra>',
                name=provider
            ))

        # Add reference lines for error rate thresholds
        fig.add_hline(y=0.01, line_dash="dash", line_color="red", opacity=0.5,
                     annotation_text="1% error threshold", annotation_position="right")
        fig.add_hline(y=0.05, line_dash="dash", line_color="orange", opacity=0.5,
                     annotation_text="5% error threshold", annotation_position="right")

        fig.update_layout(
            title=f'{add_title} Model Reliability: Error Rate vs Usage<br><sub>Bubble size represents total count | Color represents provider</sub>',
            xaxis_title='Total Count (Number of Requests)',
            yaxis_title='Error Rate',
            xaxis_type='log',
            yaxis_type='log',
            hovermode='closest',
            template='plotly_white',
            width=1400,
            height=900,
            font=dict(size=12),
            plot_bgcolor='#f8f9fa',
            showlegend=True,
            legend=dict(title=dict(text='Provider'), yanchor="top", y=0.99, xanchor="left", x=0.01)
        )

        # Add stats annotation
        avg_error = np.mean(router_model.model_error_rates())
        total_requests = sum(router_model.total_count_used())
        stats_text = (f"<b>Statistics:</b><br>"
                     f"Models analyzed: {len(router_model.model_model_names())}<br>"
                     f"Avg error rate: {avg_error:.4f}<br>"
                     f"Total requests: {total_requests:,}")

        fig.add_annotation(text=stats_text, xref="paper", yref="paper",
                          x=0.98, y=0.02, showarrow=False, bgcolor="white",
                          bordercolor="black", borderwidth=1, xanchor='right', yanchor='bottom', align='left')

        html_str = fig.to_html(include_plotlyjs='cdn', div_id="plotly-div", config={'displayModeBar': False})
        return OpenRouterAnalyticsService._inject_react_communication_js(html_str)

    @staticmethod
    def create_figure_avg_tokens_vs_price(router_model: OpenRouterModelData) -> str:
        """Figure 8: Average Tokens per Request vs Completion Price - bubble size = error rate"""
        max_error = max(router_model.model_error_rates()) if router_model.model_error_rates() else 1
        normalized_sizes = [(e / max_error) * 50 + 10 for e in router_model.model_error_rates()]

        fig = go.Figure()
        unique_provider_color_dict = OpenRouterAnalyticsService._get_provider_colors(router_model)

        for provider in sorted(unique_provider_color_dict.keys()):
            provider_indices = [i for i, p in enumerate(router_model.model_providers()) if p == provider]

            fig.add_trace(go.Scatter(
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
                    [router_model.model_providers()[i] for i in provider_indices],
                    [router_model.model_ids()[i] for i in provider_indices]
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
                name=provider
            ))

        fig.update_layout(
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

        html_str = fig.to_html(include_plotlyjs='cdn', div_id="plotly-div", config={'displayModeBar': False})
        return OpenRouterAnalyticsService._inject_react_communication_js(html_str)

