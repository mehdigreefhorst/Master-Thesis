

from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_entity import ClusterEntity, ClusterPostPrepStatusType, ClusterTextThreadModeType, ClusterStatusType
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity
from app.database.entities.scraper_entity import ScraperEntity
from app.database import get_cluster_repository, get_cluster_unit_repository, get_post_repository, get_scraper_cluster_repository


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
            post_entity_ids= post_entity_ids
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
    def start_preparing_clustering(scraper_cluster_entity: ScraperClusterEntity, prompt: str):
        cluster_entity = ClusterPrepService.get_or_create_cluster_entity(scraper_cluster_entity)
        cluster_entity.prompt = prompt
        get_cluster_repository().update(cluster_entity.id, {"prompt": prompt})
        for post_prep_status, post_id in cluster_entity.post_entity_ids_prep_status.items():
            if post_prep_status == ClusterPostPrepStatusType.Created:
                ClusterPrepService.convert_post_entity_to_cluster_units(cluster_entity, post_id)
            elif post_prep_status == ClusterPostPrepStatusType.Ongoing:
                # TODO what do we do here, it is probably not finished correctly?
                raise Exception(f"We are with {cluster_entity.id} in a problem with post: {post_id} | we are ongoing???")
            elif post_prep_status == ClusterPostPrepStatusType.Completed:
                print(f"cluster_entity_id {cluster_entity.id} already finished with finished {post_id}")

    @staticmethod
    def convert_post_entity_to_cluster_units(cluster_entity: ClusterEntity, post_id: PyObjectId):
        post_entity = get_post_repository().find_by_id(post_id)
        # First we add the post as text by itself. since it is already valuable. Should we also add metadata of the replies/ comments?

        # now we loop over each comment. and we send the post with commment to the LLM

        # now we loop over the replies, this should send a function call to a new function with a recursive loop in it






        






