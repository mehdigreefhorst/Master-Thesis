

from collections import defaultdict
from datetime import datetime
import json
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field
from app.database.entities.base_entity import BaseEntity, PyObjectId
from app.database.entities.label_template import LabelTemplateEntity, LabelTemplateTruthProjection, LabelTemplateLLMProjection, ProjectionLabelField, labelName
from app.database.entities.post_entity import PostEntity, CommentEntity


class ClusterUnitEntityCategory(BaseModel):
    """
    problem_description (The use describes a problem that it faces)
    frustration_expression (The user expresser a frustration about something they face)
    solution_seeking (The user is looking for a solution)
    solution_attempted (The user explains an experience to using a solution)
    solution_proposing (The user suggests a solution to someone else)
    agreement_empathy (The user is emphathetic towards another user)
    none_of_the_above
    """
    problem_description: bool = False
    frustration_expression: bool  = False
    solution_seeking: bool  = False
    solution_attempted: bool  = False
    solution_proposing: bool  = False
    agreement_empathy: bool  = False
    none_of_the_above: bool  = False

    @classmethod
    def category_field_names(cls) -> list[str]:
        return list(ClusterUnitEntityCategory.model_fields.keys()) 




class TokenUsageAttempt(BaseModel):
    """Tracks a single API call attempt, whether successful or failed"""
    tokens_used: Dict  # Model dump from the token usage object from the LLM provider
    attempt_number: int  # Which retry attempt (1-indexed)
    success: bool  # Whether this attempt resulted in a valid prediction
    error_message: Optional[str] = None  # If failed, what was the error


class PredictionCategoryTokens(BaseModel):
    """A successful prediction with its token usage"""
    labels_prediction: LabelTemplateLLMProjection
    tokens_used: Dict  # Tokens from the successful attempt
    all_attempts_token_usage: List[TokenUsageAttempt] = Field(default_factory=list)  # All attempts including failures
    total_tokens_all_attempts: Dict = Field(default_factory=dict)  # Aggregate of all attempts


class ClusterUnitEntityPredictedCategory(BaseModel):
    """
    Combines the clusterunit category and the prompt id that predicted the category
    """
    experiment_id: PyObjectId
    predicted_categories: List[PredictionCategoryTokens]

    def get_aggregate_runs_prediction_counter(self) -> Dict[str, int]:
        """create aggregate prediction counter, of all runs of a single cluster unit where it is a dictionary. where each of the label names is the key. and value is count. 
        works only for the boolean types"""
        aggregate_prediction_counter = defaultdict(int)
        for prediction in self.predicted_categories:
            prediction_counter = prediction.labels_prediction.get_prediction_counter()
            for label_name, label_true_counter in prediction_counter.items():
                aggregate_prediction_counter[label_name] += label_true_counter
        
        return aggregate_prediction_counter
    
    def get_label_template_id(self):
        return self.predicted_categories[0].labels_prediction.label_template_id
    
    def get_count_predicted_category_equal_to_expected_value(self, label_name: str, expected_value: Any):
        count = 0
        for predicted_category in self.predicted_categories:
            count += predicted_category.labels_prediction.get_count_predicted_label_expected_value(label_name=label_name,
                                                                                          expected_value=expected_value)
        return count
    
    def get_label_per_label_values(self, label_name: str, per_label_detail_label_name: str = "reason") -> List[str]:
        """gets the values of a per label label"""
        per_label_values: List[str] = list()
        for predicted_category in self.predicted_categories:
            label_value = predicted_category.labels_prediction.values.get(label_name)
            if not label_value:
                per_label_values.append("")
            else:
                for per_label_details in label_value.per_label_details:
                    if per_label_details.label == per_label_detail_label_name:
                        per_label_values.append(per_label_details.value)
        
        return per_label_values
    
    def get_label_values(self, label_name: str) -> List[str | bool | int | float]:
        """returns the values of a label_name"""
        values: List[str] = list()
        for predicted_category in self.predicted_categories:
            label_value = predicted_category.labels_prediction.values.get(label_name)
            values.append(label_value.value)
        return values





class ClusterUnitEntity(BaseEntity):
    cluster_entity_id: PyObjectId # ClusterInstanceEntity
    post_id: PyObjectId # The post_id of the entity
    comment_post_id: PyObjectId # RedditBaseEntity
    replied_to_cluster_unit_id: Optional[PyObjectId] = None
    type: Literal["post", "comment"]
    reddit_id: str # official "REDDIT" reddit id
    permalink: str = ""
    author: str
    usertag: Optional[str]
    upvotes: int
    downvotes: int
    depth: int = 0
    created_utc: int
    thread_path_text: List[str] | None # the text of posts full prior thread (post -> comment -> reply --> ...) up until the current comment
    thread_path_author: List[str] = [] # the author of posts full prior thread (post -> comment -> reply --> ...) up until the current comment
    enriched_comment_thread_text: str | None # what the LLM made from the thread path text & text
    predicted_category: Optional[Dict[PyObjectId, ClusterUnitEntityPredictedCategory]] = None # experiment_id: PyObjectId as key
    ground_truth: Optional[Dict[PyObjectId, LabelTemplateTruthProjection]]  = None # The key is the label_template_id, value is the ground truth field
    text: str # the author's individual text contribution to reddit
    total_nested_replies: Optional[int] = None # Total nr of replies on the post summed up, replies to replies also count
    subreddit: str
    includes_media: Optional[bool] = None

    # def create_prompt_one_shot_example(self, label_template_entity: LabelTemplateEntity):
    #     if label_template_entity.id not in self.ground_truth:
    #         raise Exception(f"label_template_entity.id = {label_template_entity.id}  is missing in {self.id}")
    #     output_dict = dict()
    #     for label_name, label in self.ground_truth[label_template_entity.id].values:
    #         label_per_label_dict = dict()
    #         for label in label_template_entity.llm_prediction_fields_per_label
    #     return json.dumps(self.values, indent=4)



    @classmethod
    def from_post(cls, post_entity: PostEntity, cluster_entity_id: PyObjectId):
        if not isinstance(post_entity, PostEntity):
            raise Exception(f"Wrong type it should be a post entity for post: = {post_entity}!")
        
        return cls(
            cluster_entity_id=cluster_entity_id,
            post_id= post_entity.id,
            comment_post_id= post_entity.id,
            replied_to_cluster_unit_id=None,
            type= "post",
            reddit_id= post_entity.reddit_id,
            permalink=post_entity.permalink,
            author= post_entity.author,
            usertag= post_entity.user_tag,
            upvotes= post_entity.upvotes,
            downvotes= post_entity.downvotes,
            depth=0,
            created_utc=post_entity.created_utc,
            thread_path_text=  [], # the text full prior thread (post -> comment -> reply --> ...) up until the current comment
            thread_path_author= [], # the author full prior thread (post -> comment -> reply --> ...) up until the current comment
            enriched_comment_thread_text= None, # what the LLM made from the thread path text & text
            text= "post_title: " + post_entity.title + "\n" + post_entity.text, # the author's individual text contribution to reddit
            subreddit=post_entity.subreddit,
            includes_media= post_entity.has_media()

        )
    
    @classmethod
    def from_comment(cls, comment_entity: CommentEntity, cluster_entity_id: PyObjectId, post_id: PyObjectId, subreddit: str, post_permalink: str, reply_to_cluster_unit: "ClusterUnitEntity"):
        if not isinstance(comment_entity, CommentEntity):
            raise Exception(f"Wrong type: {type(comment_entity)}it should be a comment entity for comment: = {comment_entity}!")
        
        return cls(
            cluster_entity_id=cluster_entity_id,
            post_id= post_id,
            comment_post_id= comment_entity.id,
            replied_to_cluster_unit_id=reply_to_cluster_unit.id,
            type= "comment",
            reddit_id= comment_entity.reddit_id,
            permalink=f"{post_permalink}/{comment_entity.reddit_id}",
            author= comment_entity.author,
            usertag= comment_entity.user_tag,
            upvotes= comment_entity.upvotes,
            downvotes= comment_entity.downvotes,
            depth=comment_entity.depth,
            created_utc= comment_entity.created_utc,
            thread_path_text= reply_to_cluster_unit.thread_path_text + [reply_to_cluster_unit.text], # the full prior thread (post -> comment -> reply --> ...) up until the current comment
            thread_path_author= reply_to_cluster_unit.thread_path_author + [reply_to_cluster_unit.author],
            enriched_comment_thread_text= None, # what the LLM made from the thread path text & text
            text= comment_entity.text, # the author's individual text contribution to reddit
            subreddit=subreddit,
            includes_media=comment_entity.has_media()
        )
    
    def get_value_of_ground_truth_variable(self, label_template_id: PyObjectId, variable_name: str):
        ground_truth = self.ground_truth.get(label_template_id)
        if not ground_truth:
            raise Exception("can't take value of ground truth that doesn't exist")
        
        prediction_category = ground_truth.values.get(variable_name)

        if not prediction_category:
            raise Exception("can't take value of prediction category that doesn't exist")
        return prediction_category.value
    

    def get_experiment_ids(self, filter_label_template_id: Optional[str] = None) -> List[PyObjectId]:
        """gets the experiment_ids that the user has particpated in for a specific label_template_id"""
        if filter_label_template_id is None:

            return [experiment_id for experiment_id in self.predicted_category.keys()]
        
        return  [experiment_id for experiment_id, prediction_category in self.predicted_category.items() if prediction_category.get_label_template_id() ==  filter_label_template_id]


    def get_count_predicted_label_equal_to_ground_truth(self, label_name: str, experiment_id: PyObjectId, label_template_id: PyObjectId):
        ground_truth_value = self.get_value_of_ground_truth_variable(label_template_id=label_template_id,
                                                                     variable_name=label_name)
        predicted_category = self.predicted_category.get(experiment_id)
        if not predicted_category:
            return 0
        return predicted_category.get_count_predicted_category_equal_to_expected_value(label_name=label_name, expected_value=ground_truth_value)
    
    def get_per_label_runs_one_experiment(self, label_name: str, experiment_id: PyObjectId, per_label_detail_label_name: str = "reason") -> List[str | bool | int | float]:
        per_label_values: List[str] = list()
        predicted_category = self.predicted_category.get(experiment_id)
        if not predicted_category:
            return per_label_values
        
        return predicted_category.get_label_per_label_values(label_name=label_name, per_label_detail_label_name=per_label_detail_label_name)
        
    def get_per_label_dict_single_experiment(self, label_name: str, experiment_id: PyObjectId, per_label_detail_label_names: List[str]) -> Dict[str, List[str | bool | int | float]]:
        """gets all the per label details of a single experiment inside a cluster unit. Returns a dict of the per label name"""
        per_label_dict = dict()
        for per_label in per_label_detail_label_names:
            per_label_list = self.get_per_label_runs_one_experiment(label_name=label_name,
                                                                           experiment_id=experiment_id,
                                                                           per_label_detail_label_name=per_label)
            per_label_dict[per_label] = per_label_list
        
        return per_label_dict
    
    def get_label_values_single_experiment(self, label_name: str, experiment_id: PyObjectId) -> List[str | int | float | bool]:
        label_values: List[str] = list()
        predicted_category = self.predicted_category.get(experiment_id)
        if not predicted_category:
            return label_values
        values = predicted_category.get_label_values(label_name=label_name)
        return values