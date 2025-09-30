from typing import Any

from bson import CodecOptions
from flask import current_app, g
from flask_pymongo import PyMongo
from flask_pymongo.wrappers import Database

from app.database.cluster_repository import ClusterRepository
from app.database.cluster_unit_repository import ClusterUnitRepository
from app.database.post_repository import PostRepository
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