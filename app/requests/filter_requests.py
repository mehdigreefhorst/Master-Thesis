from typing import List, Literal, Optional
from pydantic import BaseModel
from app.database.entities.base_entity import PyObjectId


class FilterClusterUnitsRequest(BaseModel):
    """Request model for filtering cluster units with dynamic filter options"""
    scraper_cluster_id: PyObjectId
    reddit_message_type: Literal["post", "comment", "all"] = "all"
    subreddits: Optional[List[str]] = None
    authors: Optional[List[str]] = None
    upvotes_min: Optional[int] = None
    upvotes_max: Optional[int] = None
    downvotes_min: Optional[int] = None
    downvotes_max: Optional[int] = None
    has_ground_truth: Optional[bool] = None
    has_predictions: Optional[bool] = None
    ground_truth_labels: Optional[List[str]] = None  # Filter by specific labels that are true
    predicted_labels: Optional[List[str]] = None  # Filter by predicted labels
    experiment_id: Optional[PyObjectId] = None  # Filter by specific experiment predictions
    sort_by: Optional[str] = "created_utc"  # or "upvotes", "downvotes", "author"
    sort_order: Optional[str] = "desc"  # or "asc"
    limit: Optional[int] = 1000
    skip: Optional[int] = 0


class ExtractStandaloneStatementsRequest(BaseModel):
    """Request model for extracting standalone statements from filtered cluster units"""
    cluster_unit_ids: List[PyObjectId]
    scraper_cluster_id: PyObjectId
    statement_type: Literal["problems", "solutions", "both"] = "both"
    cluster_method: Literal["bertopic", "llm"] = "bertopic"
    # BERTopic specific parameters
    min_topic_size: Optional[int] = 5
    nr_topics: Optional[str] = "auto"  # or specific number
    # LLM specific parameters
    llm_model: Optional[str] = "gpt-4"
    llm_prompt_version: Optional[str] = None


class LLMClusteringRequest(BaseModel):
    """Request model for LLM-based category prediction and clustering"""
    cluster_unit_ids: List[PyObjectId]
    scraper_cluster_id: PyObjectId
    llm_model: str = "gpt-4"
    llm_prompt_version: str = "v1.0"
    clustering_approach: Literal["category_based", "semantic_similarity"] = "category_based"
    # Category-based: Group by predicted categories
    # Semantic similarity: Use LLM embeddings + clustering algorithm
    categories_to_cluster: Optional[List[str]] = None  # If None, use all categories
