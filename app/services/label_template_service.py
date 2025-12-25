

from typing import Any, Dict, List
from app.database import get_cluster_unit_repository, get_experiment_repository, get_label_template_repository, get_prompt_repository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import ClusterUnitEntity
from app.database.entities.experiment_entity import ExperimentEntity
from app.database.entities.label_template import LLMLabelField, LabelTemplateEntity, LabelTemplateTruthProjection


from app.responses.get_experiments_response import ExperimentModelInformation, GetSampleUnitsLabelingFormatResponse
from app.utils.logging_config import get_logger

# Initialize logger for this module
logger = get_logger(__name__)


class LabelTemplateService:
    
    @staticmethod
    def create_label_template_entity(user_id: PyObjectId, 
                                     category_name: str, 
                                     category_description: str, 
                                     is_public: bool, 
                                     labels: LLMLabelField, 
                                     llm_prediction_fields_per_label: LLMLabelField, 
                                     multi_label_possible: bool
                                     ):
        label_template_entity = LabelTemplateEntity(user_id=user_id,
                                            category_name=category_name,
                                            category_description=category_description,
                                            is_public=is_public,
                                            labels=labels,
                                            llm_prediction_fields_per_label=llm_prediction_fields_per_label,
                                            multi_label_possible=multi_label_possible)
        label_template_entity.create_ground_truth_field()
    

    @staticmethod
    def convert_sample_cluster_units_return_format(cluster_unit_entities: List[ClusterUnitEntity], label_template_entities: List[LabelTemplateEntity]) -> Dict:
        
        for label_template_entity in label_template_entities:
          label_template_entity._create_ground_truth_field()
          get_label_template_repository().update(label_template_entity.id, label_template_entity)
          for cluster_unit_entity in cluster_unit_entities:
              if cluster_unit_entity.ground_truth is None:
                  cluster_unit_entity.ground_truth = dict()
              if label_template_entity.id not in cluster_unit_entity.ground_truth:
                  logger.info(f"the label_template ground trut doesn't yet exist for cluster unit entity id {(cluster_unit_entity.id)}, so we create it and add to db for label_template_id : {label_template_entity.id}")
                  #logger.info(f"label_template_entity.ground_truth_field.copy() = ", label_template_entity.model_dump_json(indent=4))
                  cluster_unit_entity.ground_truth[label_template_entity.id] = label_template_entity.ground_truth_field.model_copy()
                  get_cluster_unit_repository().update(cluster_unit_entity.id, cluster_unit_entity)
              
        returnable_cluster_units = [cluster_unit_entity.model_dump() for cluster_unit_entity in cluster_unit_entities]
        return returnable_cluster_units
    
    @staticmethod
    def convert_sample_cluster_units_return_format_labeling_format(cluster_unit_entities: List[ClusterUnitEntity], label_template_entity: LabelTemplateEntity) -> GetSampleUnitsLabelingFormatResponse:
        

        label_template_entity._create_ground_truth_field()
        get_label_template_repository().update(label_template_entity.id, label_template_entity)


        for cluster_unit_entity in cluster_unit_entities:
            if cluster_unit_entity.ground_truth is None:
                cluster_unit_entity.ground_truth = dict()
            if label_template_entity.id not in cluster_unit_entity.ground_truth:
                logger.info(f"the label_template ground trut doesn't yet exist for cluster unit entity id {(cluster_unit_entity.id)}, so we create it and add to db for label_template_id : {label_template_entity.id}")
                #logger.info(f"label_template_entity.ground_truth_field.copy() = ", label_template_entity.model_dump_json(indent=4))
                cluster_unit_entity.ground_truth[label_template_entity.id] = label_template_entity.ground_truth_field.model_copy()
                get_cluster_unit_repository().update(cluster_unit_entity.id, cluster_unit_entity)

        
        sample_units_return_format_labeling: GetSampleUnitsLabelingFormatResponse = GetSampleUnitsLabelingFormatResponse.create_from_cluster_units_label_template_id(
            cluster_unit_entities=cluster_unit_entities,
            label_template=label_template_entity
        )
        return sample_units_return_format_labeling
    
    @staticmethod
    def convert_sample_cluster_units_return_standalone_format(cluster_unit_entities: List[ClusterUnitEntity], label_template_entity: LabelTemplateEntity) -> GetSampleUnitsLabelingFormatResponse:

        sample_units_return_format_labeling: GetSampleUnitsLabelingFormatResponse = GetSampleUnitsLabelingFormatResponse.create_from_cluster_units_label_template_id(
            cluster_unit_entities=cluster_unit_entities,
            label_template=label_template_entity
        )
        return sample_units_return_format_labeling
    
    @staticmethod
    def update_existing_ground_truth_value(cluster_unit_entity_id: str,
                                           label_template_id: str,
                                           ground_truth_label_name: str,
                                           ground_truth_value: Any):
        result = get_cluster_unit_repository().update_ground_truth_category(cluster_unit_entity_id=cluster_unit_entity_id,
                                                                        label_template_id=label_template_id,
                                                                        ground_truth_category=ground_truth_label_name,
                                                                        ground_truth=ground_truth_value)
        return result

    @staticmethod
    def new_ground_truth_value_correct_format(label_template_entity: LabelTemplateEntity, ground_truth_label_name: str, ground_truth_value: Any):
        for label in label_template_entity.labels:
            if label.label == ground_truth_label_name and label.label_value_allowed(ground_truth_value):
                return ground_truth_value

    @staticmethod
    def update_ground_truth(cluster_unit_entity: ClusterUnitEntity, label_template_entity: LabelTemplateEntity, ground_truth_label_name: str, ground_truth_value: Any):
        # check if ground truth is in correct data format in order to be added
        ground_truth_value_formatted = LabelTemplateService().new_ground_truth_value_correct_format(label_template_entity= label_template_entity, ground_truth_label_name=ground_truth_label_name, ground_truth_value=ground_truth_value)
        if ground_truth_value_formatted is None:
            raise Exception("ground_truth_value_formatted did not go well!")
        ground_truth = cluster_unit_entity.ground_truth.get(label_template_entity.id)

        # check whether the ground truth is already created in the cluster unit
        if ground_truth and isinstance(ground_truth, LabelTemplateTruthProjection) and ground_truth.values.get(ground_truth_label_name):
            result = LabelTemplateService.update_existing_ground_truth_value(
                cluster_unit_entity_id=cluster_unit_entity.id,
                label_template_id=label_template_entity.id,
                ground_truth_label_name=ground_truth_label_name,
                ground_truth_value=ground_truth_value_formatted

            )
            return result
        else:
            raise Exception("The ground truth should already been created in earlier step")
            # ground truth doesn't exist yet in cluster unit

    @staticmethod
    def cluster_unit_entities_done_labeling_ground_truth(cluster_unit_entities: List[ClusterUnitEntity], label_template_entity: LabelTemplateEntity) -> bool:
        """verifies if each of the cluster units have been labeled for the ground truth
        Return True if ground truth has been labeled. False if not"""
        for cluster_unit_entity in cluster_unit_entities:
            ground_truth = cluster_unit_entity.ground_truth.get(label_template_entity.id)
            if not ground_truth:
                return False
            
            if not ground_truth.has_been_labeled():
                return False
            
        return True
            
        
    