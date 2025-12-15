from typing import Any

from bson import CodecOptions
from flask import current_app, g
from flask_pymongo import PyMongo
from flask_pymongo.wrappers import Database

from app.database.label_template_repository import LabelTemplateRepository
from app.database.cluster_repository import ClusterRepository
from app.database.cluster_unit_repository import ClusterUnitRepository
from app.database.experiment_repository import ExperimentRepository
from app.database.openrouter_data_repository import OpenRouterDataRepository
from app.database.post_repository import PostRepository
from app.database.prompt_repository import PromptRepository
from app.database.sample_repository import SampleRepository
from app.database.scraper_cluster_repository import ScraperClusterRepository
from app.database.scraper_repository import ScraperRepository
from app.database.user_repository import UserRepository


DATABASE_OPTIONS = CodecOptions[Any](tz_aware=True)
from app.utils.extensions import mongo


def _get_db() -> Database:
    db = getattr(g, "_database", None)

    if db is None:
        db = g._database = mongo.cx["reddit_scraper"]

    return db

def get_post_repository() -> PostRepository:
    if not hasattr(g, "post_repository"):
        g.post_repository = PostRepository(_get_db())

    return g.post_repository

def get_user_repository() -> UserRepository:
    if not hasattr(g, "user_repository"):
        g.user_repository = UserRepository(_get_db())

    return g.user_repository

def get_scraper_repository() -> ScraperRepository:
    if not hasattr(g, "scraper_repository"):
        g.scraper_repository = ScraperRepository(_get_db())

    return g.scraper_repository

def get_cluster_repository() -> ClusterRepository:
    if not hasattr(g, "cluster_repository"):
        g.cluster_repository = ClusterRepository(_get_db())
        
    return g.cluster_repository

def get_cluster_unit_repository() -> ClusterUnitRepository:
    if not hasattr(g, "cluster_unit_repository"):
        g.cluster_unit_repository = ClusterUnitRepository(_get_db())

    return g.cluster_unit_repository

def get_scraper_cluster_repository() -> ScraperClusterRepository:
    if not hasattr(g, "cluster_scraper_repository"):
        g.cluster_scraper_repository = ScraperClusterRepository(_get_db())

    return g.cluster_scraper_repository

def get_experiment_repository() -> ExperimentRepository:
    if not hasattr(g, "experiment_repository"):
        g.experiment_repository = ExperimentRepository(_get_db())
    
    return g.experiment_repository

def get_sample_repository() -> SampleRepository:
    if not hasattr(g, "sample_repository"):
        g.sample_repository = SampleRepository(_get_db())

    return g.sample_repository

def get_prompt_repository() -> PromptRepository:
    if not hasattr(g, "prompt_repository"):
        g.prompt_repository = PromptRepository(_get_db())
    
    return g.prompt_repository

def get_openrouter_data_repository() -> OpenRouterDataRepository:
    if not hasattr(g, "openrouter_data_repository"):
        g.openrouter_data_repository = OpenRouterDataRepository(_get_db())

    return g.openrouter_data_repository

def get_label_template_repository() -> LabelTemplateRepository:
    if not hasattr(g,"label_template_repository"):
        g.label_template_repository = LabelTemplateRepository(_get_db())
    
    return g.label_template_repository
