

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field
from app.database.entities.base_entity import BaseEntity, PyObjectId
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

ClusterUnitCategoryFieldNames = Literal["problem_description", 
                                        "frustration_expression", 
                                        "solution_seeking", 
                                        "solution_attempted",
                                        "solution_proposing",
                                        "agreement_empathy",
                                        "none_of_the_above"]


class PredictionCategory(ClusterUnitEntityCategory):
    reason: str
    sentiment: Literal["negative", "neutral", "positive"]


class TokenUsageAttempt(BaseModel):
    """Tracks a single API call attempt, whether successful or failed"""
    tokens_used: Dict  # Model dump from the token usage object from the LLM provider
    attempt_number: int  # Which retry attempt (1-indexed)
    success: bool  # Whether this attempt resulted in a valid prediction
    error_message: Optional[str] = None  # If failed, what was the error


class PredictionCategoryTokens(PredictionCategory):
    """A successful prediction with its token usage"""
    tokens_used: Dict  # Tokens from the successful attempt
    all_attempts: List[TokenUsageAttempt] = Field(default_factory=list)  # All attempts including failures
    total_tokens_all_attempts: Dict = Field(default_factory=dict)  # Aggregate of all attempts


class ClusterUnitEntityPredictedCategory(BaseModel):
    """
    Combines the clusterunit category and the prompt id that predicted the category
    """
    experiment_id: PyObjectId
    predicted_categories: List[PredictionCategoryTokens]


class ClusterUnitEntity(BaseEntity):
    cluster_entity_id: PyObjectId # ClusterInstanceEntity
    post_id: PyObjectId # The post_id of the entity
    comment_post_id: PyObjectId # RedditBaseEntity
    replied_to_cluster_unit_id: Optional[PyObjectId] = None
    type: Literal["post", "comment"]
    reddit_id: str # official "REDDIT" reddit id
    author: str
    usertag: Optional[str]
    upvotes: int
    downvotes: int
    created_utc: int
    thread_path_text: List[str] | None # the text of posts full prior thread (post -> comment -> reply --> ...) up until the current comment
    thread_path_author: List[str] = [] # the author of posts full prior thread (post -> comment -> reply --> ...) up until the current comment
    enriched_comment_thread_text: str | None # what the LLM made from the thread path text & text
    predicted_category: Dict[PyObjectId, ClusterUnitEntityPredictedCategory] | None = None # experiment_id: PyObjectId as key
    ground_truth: ClusterUnitEntityCategory  = Field(default_factory=ClusterUnitEntityCategory)
    text: str # the author's individual text contribution to reddit
    total_nested_replies: Optional[int] = None # Total nr of replies on the post summed up, replies to replies also count
    subreddit: str


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
            author= post_entity.author,
            usertag= post_entity.user_tag,
            upvotes= post_entity.upvotes,
            downvotes= post_entity.downvotes,
            created_utc=post_entity.created_utc,
            thread_path_text=  [], # the text full prior thread (post -> comment -> reply --> ...) up until the current comment
            thread_path_author= [], # the author full prior thread (post -> comment -> reply --> ...) up until the current comment
            enriched_comment_thread_text= None, # what the LLM made from the thread path text & text
            text= "post_title: " + post_entity.title + "\n" + post_entity.text, # the author's individual text contribution to reddit
            subreddit=post_entity.subreddit

        )
    
    @classmethod
    def from_comment(cls, comment_entity: CommentEntity, cluster_entity_id: PyObjectId, post_id: PyObjectId, subreddit: str, reply_to_cluster_unit: "ClusterUnitEntity"):
        if not isinstance(comment_entity, CommentEntity):
            raise Exception(f"Wrong type: {type(comment_entity)}it should be a comment entity for comment: = {comment_entity}!")
        
        return cls(
            cluster_entity_id=cluster_entity_id,
            post_id= post_id,
            comment_post_id= comment_entity.id,
            replied_to_cluster_unit_id=reply_to_cluster_unit.id,
            type= "comment",
            reddit_id= comment_entity.reddit_id,
            author= comment_entity.author,
            usertag= comment_entity.user_tag,
            upvotes= comment_entity.upvotes,
            downvotes= comment_entity.downvotes,
            created_utc= comment_entity.created_utc,
            thread_path_text= comment_entity.prior_comments_thread,# the full prior thread (post -> comment -> reply --> ...) up until the current comment
            thread_path_author= reply_to_cluster_unit.thread_path_author + [reply_to_cluster_unit.author],
            enriched_comment_thread_text= None, # what the LLM made from the thread path text & text
            text= comment_entity.text, # the author's individual text contribution to reddit
            subreddit=subreddit
        )

