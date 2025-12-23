

from typing import List, Literal, Optional, Dict

from pydantic import Field
from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.utils.types import StatusType


class SampleEntity(BaseEntity):
    user_id: PyObjectId
    picked_post_cluster_unit_ids: List[PyObjectId] # The posts that the user has selected to be randomly sampled from
    sample_cluster_unit_ids: List[PyObjectId] # sample size of cluster units taken with cluster_unit equal to the above one
    sample_size: int # sample size of how many Cluster units to take
    sample_label_template_labeled_status: Dict[PyObjectId, StatusType] = Field(default_factory=dict) #StatusType.Initialized# sample lababled manually

    def add_remove_label_template(self, action: Literal["remove", "add"], label_template_id: PyObjectId):
        if action == "remove":
            self.sample_label_template_labeled_status.pop(label_template_id)
        else:
            if action == "add":
                
                self.sample_label_template_labeled_status[label_template_id] = StatusType.Initialized
    

    def set_sample_labeled_status(self, label_template_id: PyObjectId, new_status: StatusType):
        self.sample_label_template_labeled_status[label_template_id] = new_status
        

    def get_label_template_ids(self) -> List[PyObjectId]:
        return [label_template_id for label_template_id in self.sample_label_template_labeled_status.keys()]