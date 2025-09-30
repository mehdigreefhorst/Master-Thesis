

from app.database.entities.cluster_entity import ClusterEntity, ClusterTextThreadModeType, ClusterStatusType
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity
from app.database.entities.scraper_entity import ScraperEntity
from app.database import get_cluster_repository, get_cluster_unit_repository, get_scraper_cluster_repository


class ClusterPrepService:
    """the service that prepares the clusterable stuff te be ready for clustering. 
    
    """
    @staticmethod
    def prepare_cluster_entity(scraping_entity: ScraperEntity, text_thread_mode=ClusterTextThreadModeType.LlmParsedText) -> ClusterEntity:
        post_entity_ids = scraping_entity.get_all_post_entity_ids()


        # should I gather the cluster_unit_ids that have the post_ids or always recreate new cluster_unit_ids
        # For the final product I would check whether they are already available
        # But for the thesis, I might want to iterate with different prompts while still maintaining prior ones. 
        # So better for the testing phase that we are in, to create new ones. 
        cluster_entity = ClusterEntity.from_params(
            scraper_entity_id= scraping_entity.id,
            text_thread_mode= text_thread_mode,
            post_entity_ids_status= post_entity_ids
        )
        get_cluster_repository().insert(cluster_entity)
        return cluster_entity
    
    @staticmethod
    def get_or_create_cluster_entity(scraper_cluster_entity: ScraperClusterEntity) -> ClusterEntity:
        """creates the cluster entity if it is not assigned yet. Also updates the database"""
        if not scraper_cluster_entity.cluster_entity_id:
            cluster_entity = ClusterPrepService.prepare_cluster_entity()
            scraper_cluster_entity.cluster_entity_id = cluster_entity.id
            get_cluster_repository().insert(cluster_entity)
            get_scraper_cluster_repository().update(scraper_cluster_entity.id, {"cluster_entity_id": cluster_entity.id})
            return cluster_entity
        else:
            cluster_entity = get_cluster_repository().find_by_id(scraper_cluster_entity.cluster_entity_id)
            return cluster_entity
        


    @staticmethod
    def start_preparing_clustering(scraper_cluster_entity: ScraperClusterEntity):
        cluster_entity = ClusterPrepService.get_or_create_cluster_entity(scraper_cluster_entity, prompt)


        






