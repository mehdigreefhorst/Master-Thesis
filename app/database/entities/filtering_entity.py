
from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field, model_validator
from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.database.entities.label_template import LabelTemplateLLMProjection, ProjectionLabelField
from app.utils.types import StatusType


class LabelTemplateFilter(BaseModel):
    label_name: str
    allowed_values: Optional[List[str] | List[bool]] = None
    label_type: Literal["string", "boolean", "category", "integer", "float"]
    min_label_value: Optional[int] = None
    max_label_value: Optional[int] = None

    @model_validator(mode="after")
    def valiate_filters(self):
        if self.label_type == "boolean":
            if self.min_label_value is not None:
                raise Exception("no min label is allowed to be set!")
            if self.max_label_value is not None:
                raise Exception("no max label is allowed to be set!")
            if [value for value in self.allowed_values if not isinstance(value, bool)]:
                raise Exception("only booleans are allowed possible values")
        
        elif self.label_type == "integer":
            if self.allowed_values:
                raise Exception("allowed values cannot be set")

        elif self.label_type == "float":
            if self.allowed_values:
                raise Exception("allowed values cannot be set")

        elif self.label_type == "string":
            if self.min_label_value is not None:
                raise Exception("no min label is allowed to be set!")
            if self.max_label_value is not None:
                raise Exception("no max label is allowed to be set!")
            if [value for value in self.allowed_values if not isinstance(value, str)]:
                raise Exception("only string are allowed possible values")

        elif self.label_type == "category":
            if self.min_label_value is not None:
                raise Exception("no min label is allowed to be set!")
            if self.max_label_value is not None:
                raise Exception("no max label is allowed to be set!")
            if [value for value in self.allowed_values if not isinstance(value, str)]:
                raise Exception("only string are allowed possible values")

        else:
            raise Exception(f"type = {self.label_type}An unkown type is set, I don't know it! THe fuck!")
        return self
    
    def verify_projection_label_field(self, projection_label_field: ProjectionLabelField):
        if self.label_type == "boolean" or self.label_type == "category" or self.label_type == "string":
            return projection_label_field.value in self.allowed_values # :TODO we do not take into account multiple labels predicted for same value, in case this is possible (currently not, would only apply to when multi labels can be predicted for single label)
        elif self.label_type == "float" or self.label_type == "integer":
            if self.min_label_value is not None and self.max_label_value is not None:
                return projection_label_field.value > self.min_label_value and projection_label_field.value < self.max_label_value
            elif self.min_label_value is not None:
                return projection_label_field.value >= self.min_label_value
            elif self.max_label_value is not None:
                return projection_label_field.value <= self.max_label_value


class FilterMisc(BaseModel):
    min_upvotes: Optional[int] = None	
    max_upvotes: Optional[int] = None	
    min_downvotes: Optional[int] = None	
    max_downvotes: Optional[int] = None
    min_depth: Optional[int] = None
    max_depth: Optional[int] = None
    min_total_nested_replies: Optional[int] = None	
    max_total_nested_replies: Optional[int] = None	
    min_date: Optional[datetime] = None
    max_date: Optional[datetime] = None
    reddit_message_type: Optional[Literal["post", "comment", "all"]] = None

LabelName = str

class FilteringFields(BaseModel):
    label_template_id: PyObjectId
    input_id: PyObjectId # Either an experiment_id, filtering_id or cluster_entity_id
    input_type: Literal["experiment", "filtering", "cluster"]
    label_template_filter_and: Optional[Dict[LabelName, LabelTemplateFilter]] = None
    label_template_filter_OR: Optional[Dict[LabelName, LabelTemplateFilter]] = None
    filter_misc: Optional[FilterMisc] = None

    def validate_predicted_category_AND(self, label_template_prediction: LabelTemplateLLMProjection):
        """returns True If all of the filter labels rare equal to the projection labels
        
        AND gate"""
        for label_name, label_template_filter in self.label_template_filter_and.items():
            projection_label_field = label_template_prediction.values.get(label_name)
            if projection_label_field is None:
                raise Exception(f"Label template prediction is not available but filter expects it")
            if not label_template_filter.verify_projection_label_field(projection_label_field):
                return False
        
        return True
    
    def validate_predicted_category_OR(self, label_template_prediction: LabelTemplateLLMProjection):
        """returns True if any of the filter labels are equal to the projection labels 

          OR Gate """
        for label_name, label_template_filter in self.label_template_filter_OR.items():
            projection_label_field = label_template_prediction.values.get(label_name)
            if projection_label_field is None:
                raise Exception(f"Label template prediction is not available but filter expects it")
            if label_template_filter.verify_projection_label_field(projection_label_field):
                return True
        
        return False
    
    
    




class FilteringEntity(FilteringFields, BaseEntity):
    user_id: PyObjectId