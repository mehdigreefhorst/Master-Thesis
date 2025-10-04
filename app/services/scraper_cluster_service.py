


from pydantic import BaseModel

from app.database.entities.base_entity import PyObjectId
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity


class ScraperClusterService(BaseModel):
    """orchestrates the whole clustering and scraping steps"""

    def create_cluster_scraping(user_id: PyObjectId):
        scraper_cluster_entity = ScraperClusterEntity(user_id=user_id, )