

from typing import Dict, List, Literal, Optional, Tuple
from app.database import get_cluster_repository, get_cluster_unit_repository, get_experiment_repository, get_sample_repository
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_unit_entity import ClusterUnitEntity
from app.database.entities.experiment_entity import ExperimentEntity
from app.database.entities.filtering_entity import FilterMisc, FilteringEntity, FilteringFields, LabelName, LabelTemplateFilter
from app.database.entities.label_template import LabelTemplateEntity
from app.services.cluster_prep_service import ClusterPrepService


class FilteringService:
    """service for handling the Filtering Entity, and filtering actions for the UI"""

    @staticmethod
    def get_input_cluster_units(input_id: PyObjectId, input_type: Literal["experiment", "filtering", "cluster"]) -> Tuple[List[ClusterUnitEntity], ExperimentEntity | None]:
        filter = dict()
        experiment_entity = None
        if input_type == "experiment":
            experiment_entity = get_experiment_repository().find_by_id(input_id)
            sample_entity = get_sample_repository().find_by_id(experiment_entity.sample_id)
            cluster_unit_entities = get_cluster_unit_repository().find_many_by_ids(sample_entity.sample_cluster_unit_ids)
        elif input_type == "filtering":
            # :TODO to implement -> Change requirement of sample_entity_id to be present in experiment -> change to input_id
            raise Exception("No implementation yet for filtering!")
            cluster_unit_entities = ""
        elif input_type == "cluster":
            cluster_unit_entities = ClusterPrepService().find_cluster_units_from_cluster_id_message_type(cluster_entity_id=input_id, reddit_message_type="all")
        
        return cluster_unit_entities, experiment_entity
    
    @staticmethod
    def apply_filtering_label_template(cluster_unit_entity: ClusterUnitEntity, 
                        filtering_fields: FilteringFields | FilteringEntity,
                        experiment_entity: ExperimentEntity = None,
                        ) -> bool:
        """determines whether the cluster_unit_entity may remain. 
        True -> unit matches filter
        False -> Unit does not match filter"""
        if experiment_entity is None:
            return True
        if filtering_fields.label_template_filter_and:
            prediction = cluster_unit_entity.predicted_category.get(experiment_entity.id)
            if not prediction:
                raise Exception(f"prediction is missing from cluster unit! cluster_unit_id: {cluster_unit_entity.id} experiment_id {experiment_entity.id}")
            
            runs_match = 0
            for run_predicted_category in prediction.predicted_categories:
                filter_label_true = filtering_fields.validate_predicted_category_AND(run_predicted_category.labels_prediction)
                runs_match += 1 if filter_label_true else 0
            
            if not runs_match >= experiment_entity.runs_per_unit:
                return False
            
        if filtering_fields.label_template_filter_or:
            prediction = cluster_unit_entity.predicted_category.get(experiment_entity.id)
            if not prediction:
                raise Exception(f"prediction is missing from cluster unit! cluster_unit_id: {cluster_unit_entity.id} experiment_id {experiment_entity.id}")
            
            runs_match = 0
            for run_predicted_category in prediction.predicted_categories:
                filter_label_true = filtering_fields.validate_predicted_category_OR(run_predicted_category.labels_prediction)
                runs_match += 1 if filter_label_true else 0
            
            if not runs_match >= experiment_entity.runs_per_unit:
                return False
        return True
    
    @staticmethod
    def apply_filtering_misc(cluster_unit_entity: ClusterUnitEntity,
                             filtering_fields: FilteringFields | FilteringEntity
                             ) -> bool:

        if filtering_fields.filter_misc:
            filter = filtering_fields.filter_misc
            # min max upvote filter
            if filter.max_upvotes is not None and cluster_unit_entity.upvotes > filter.max_upvotes:
                return False
            elif filter.min_upvotes is not None and cluster_unit_entity.upvotes < filter.min_upvotes:
                return False
            
            if filter.max_downvotes is not None and cluster_unit_entity.downvotes > filter.max_downvotes:
                return False
            elif filter.min_downvotes is not None and cluster_unit_entity.downvotes < filter.min_downvotes:
                return False
            
            if filter.max_depth is not None and cluster_unit_entity.depth > filter.max_depth:
                return False
            elif filter.min_depth is not None and cluster_unit_entity.depth < filter.min_depth:
                return False
            
            if filter.max_total_nested_replies is not None and cluster_unit_entity.total_nested_replies > filter.max_total_nested_replies:
                return False
            elif filter.min_total_nested_replies is not None and cluster_unit_entity.total_nested_replies < filter.min_total_nested_replies:
                return False
            
            if filter.max_date is not None and cluster_unit_entity.created_utc > filter.max_date.timestamp():
                return False
            elif filter.min_date is not None and cluster_unit_entity.created_utc < filter.min_date.timestamp():
                return False
            
            if filter.reddit_message_type is not None:
              if filter.reddit_message_type == "post" and cluster_unit_entity.type != "post":
                  return False
              elif filter.reddit_message_type == "comment" and cluster_unit_entity.type != "comment":
                  return False
              # We do not need to check whether it is reddit_message_type = "all" -> we can skip this one as all is allowed

        return True

    @staticmethod
    def filter_cluster_units(cluster_unit_entities: List[ClusterUnitEntity],
                             filtering_fields: FilteringFields | FilteringEntity,
                             experiment_entity: ExperimentEntity = None) -> List[ClusterUnitEntity]:
        
        filtered_cluster_units = [cluster_unit 
         for cluster_unit in cluster_unit_entities 
            if FilteringService.apply_filtering_label_template(cluster_unit, filtering_fields, experiment_entity)
            and FilteringService.apply_filtering_misc(cluster_unit, filtering_fields)
        ]

        return filtered_cluster_units
            
        
        
    
    
    @staticmethod
    def create_filter_entity_from_query(body: FilteringFields):
        pass