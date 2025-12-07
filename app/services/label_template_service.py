

from app.database.entities.base_entity import PyObjectId
from app.database.entities.label_template import LLMLabelField, LabelTemplateEntity


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
        
        