

from datetime import datetime
from typing import List, Literal, Optional

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
    problem_description: bool | None = None
    frustration_expression: bool | None = None
    solution_seeking: bool | None = None
    solution_attempted: bool | None = None
    solution_proposing: bool | None = None
    agreement_empathy: bool | None = None
    none_of_the_above: bool | None = None

    @classmethod
    def field_names(cls) -> list[str]:
        return list(cls.model_fields.keys()) 

ClusterUnitCategoryFieldNames = Literal["problem_description", 
                                        "frustration_expression", 
                                        "solution_seeking", 
                                        "solution_attempted",
                                        "solution_proposing",
                                        "agreement_empathy",
                                        "none_of_the_above"]


class ClusterUnitEntityPredictedCategory(ClusterUnitEntityCategory):
    """
    Combines the clusterunit category and the prompt id that predicted the category
    """
    prompt_id: PyObjectId

class ClusterUnitEntity(BaseEntity):
    cluster_entity_id: PyObjectId # ClusterInstanceEntity
    post_id: PyObjectId # The post_id of the entity
    comment_post_id: PyObjectId # RedditBaseEntity
    type: Literal["post", "comment"]
    reddit_id: str # official "REDDIT" reddit id
    author: str
    usertag: Optional[str]
    upvotes: int
    downvotes: int
    created_utc: int
    thread_path_text: List[str] | None # the full prior thread (post -> comment -> reply --> ...) up until the current comment
    enriched_comment_thread_text: str | None # what the LLM made from the thread path text & text
    predicted_category: List[ClusterUnitEntityPredictedCategory] | None = None
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
            type= "post",
            reddit_id= post_entity.reddit_id,
            author= post_entity.author,
            usertag= post_entity.user_tag,
            upvotes= post_entity.upvotes,
            downvotes= post_entity.downvotes,
            created_utc=post_entity.created_utc,
            thread_path_text=  [],# the full prior thread (post -> comment -> reply --> ...) up until the current comment
            enriched_comment_thread_text= None, # what the LLM made from the thread path text & text
            text= "post_title: " + post_entity.title + "\n" + post_entity.text, # the author's individual text contribution to reddit
            subreddit=post_entity.subreddit

        )
    
    @classmethod
    def from_comment(cls, comment_entity: CommentEntity, cluster_entity_id: PyObjectId, post_id: PyObjectId, subreddit: str):
        if not isinstance(comment_entity, CommentEntity):
            raise Exception(f"Wrong type: {type(comment_entity)}it should be a comment entity for comment: = {comment_entity}!")
        
        return cls(
            cluster_entity_id=cluster_entity_id,
            post_id= post_id,
            comment_post_id= comment_entity.id,
            type= "comment",
            reddit_id= comment_entity.reddit_id,
            author= comment_entity.author,
            usertag= comment_entity.user_tag,
            upvotes= comment_entity.upvotes,
            downvotes= comment_entity.downvotes,
            created_utc= comment_entity.created_utc,
            thread_path_text=  comment_entity.prior_comments_thread,# the full prior thread (post -> comment -> reply --> ...) up until the current comment
            enriched_comment_thread_text= None, # what the LLM made from the thread path text & text
            text= comment_entity.text, # the author's individual text contribution to reddit
            subreddit=subreddit
        )

