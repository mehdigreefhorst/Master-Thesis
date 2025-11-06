

from typing import List
from app.database.entities.cluster_unit_entity import ClusterUnitEntity
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

        for run in range(experiment_entity.runs_per_unit):
            
    

    @staticmethod
    def parse_classification_prompt(cluster_unit_entity: ClusterUnitEntity, prompt_entity: PromptEntity):
        if not prompt_entity.category == PromptCategory.Classify_cluster_units:
            raise Exception("The prompt is of the wrong type!!!")
        
        formatted_prompt = LlmHelper.custom_formatting(
            prompt=prompt_entity.prompt,
            conversation_thread=str(cluster_unit_entity.thread_path_text),
            final_reddit_message=cluster_unit_entity.text)
        
        return formatted_prompt