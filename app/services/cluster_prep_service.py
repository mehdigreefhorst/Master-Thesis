

from typing import List
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_entity import ClusterEntity, ClusterTextThreadModeType
from app.database.entities.cluster_unit_entity import ClusterUnitEntity
from app.database.entities.post_entity import CommentEntity
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity
from app.database.entities.scraper_entity import ScraperEntity
from app.database import get_cluster_repository, get_cluster_unit_repository, get_post_repository, get_scraper_cluster_repository, get_scraper_repository
from app.utils.types import StatusType


class ClusterPrepService:
    """the service that prepares the clusterable stuff te be ready for clustering. 
    
    """
    @staticmethod
    def prepare_cluster_entity(scraper_cluster_entity: ScraperClusterEntity, text_thread_mode=ClusterTextThreadModeType.LlmParsedText) -> ClusterEntity:
        scraper_entity = get_scraper_repository().find_by_id(scraper_cluster_entity.scraper_entity_id)
        post_entity_ids = scraper_entity.get_all_post_entity_ids()


        # should I gather the cluster_unit_ids that have the post_ids or always recreate new cluster_unit_ids
        # For the final product I would check whether they are already available
        # But for the thesis, I might want to iterate with different prompts while still maintaining prior ones. 
        # So better for the testing phase that we are in, to create new ones. 
        cluster_entity = ClusterEntity.from_params(
            scraper_entity_id= scraper_entity.id,
            text_thread_mode= text_thread_mode,
            post_entity_ids= post_entity_ids
        )
        return cluster_entity
    
    @staticmethod
    def get_or_create_cluster_entity(scraper_cluster_entity: ScraperClusterEntity) -> ClusterEntity:
        """creates the cluster entity if it is not assigned yet. Also updates the database"""
        if not scraper_cluster_entity.cluster_entity_id:
            cluster_entity = ClusterPrepService.prepare_cluster_entity(scraper_cluster_entity)
            scraper_cluster_entity.cluster_entity_id = cluster_entity.id
            get_cluster_repository().insert(cluster_entity)
            get_scraper_cluster_repository().update(scraper_cluster_entity.id, {"cluster_entity_id": cluster_entity.id})
            return cluster_entity
        else:
            cluster_entity = get_cluster_repository().find_by_id(scraper_cluster_entity.cluster_entity_id)
            return cluster_entity

    @staticmethod
    def start_preparing_clustering(scraper_cluster_entity: ScraperClusterEntity, prompt: str) -> int:
        cluster_entity = ClusterPrepService.get_or_create_cluster_entity(scraper_cluster_entity)
        cluster_entity.prompt = prompt
        get_cluster_repository().update(cluster_entity.id, {"prompt": prompt})

        # Retrieve all cluster units that have already been created
        all_previously_added_cluster_units = get_cluster_unit_repository().find({"cluster_entity_id": cluster_entity.id})
        previous_found_post_ids_set = set([cluster_unit.post_id for cluster_unit in all_previously_added_cluster_units])

        all_inserted_cluster_unit_entities = []
        for post_id, post_prep_status  in cluster_entity.post_entity_ids_prep_status.items():
            print("processing post_id = ", post_id)
            if post_prep_status == StatusType.Initialized:
                if post_id in previous_found_post_ids_set:
                    continue
                inserted_cluster_unit_entities = ClusterPrepService.convert_post_entity_to_cluster_units(cluster_entity, post_id)
                all_inserted_cluster_unit_entities.extend(inserted_cluster_unit_entities)
            elif post_prep_status == StatusType.Ongoing:
                # TODO what do we do here, it is probably not finished correctly?
                raise Exception(f"We are with {cluster_entity.id} in a problem with post: {post_id} | we are ongoing???")
            elif post_prep_status == StatusType.Completed:
                print(f"cluster_entity_id {cluster_entity.id} already finished with finished {post_id}")
            else:
                print(f"ERROR cluster_entity_id {cluster_entity.id} has a problem with {post_id} since post_prep_status = {post_prep_status}")
        
        return len(all_inserted_cluster_unit_entities)

    @staticmethod
    def convert_post_entity_to_cluster_units(cluster_entity: ClusterEntity, post_id: PyObjectId) -> List[PyObjectId]:
        post_entity = get_post_repository().find_by_id(post_id)
        # First we add the post as text by itself. since it is already valuable. Should we also add metadata of the replies/ comments?
        cluster_unit_entities = []
        cluster_unit_entities.append(ClusterUnitEntity.from_post(post_entity, cluster_entity.id))
        # now we loop over each comment. To convert them into cluster unit entities. It also takes care of the replies
        for comment in post_entity.comments:
            cluster_unit_entities.append(ClusterUnitEntity.from_comment(comment, cluster_entity.id, post_id))
            
            if comment.replies:
                ClusterPrepService.convert_comment_entity_to_cluster_units(
                    replies=comment.replies, 
                    post_id=post_id, 
                    cluster_entity=cluster_entity, 
                    cluster_unit_entities=cluster_unit_entities)
                
        return get_cluster_unit_repository().insert_list_entities(cluster_unit_entities).inserted_ids

    @staticmethod
    def convert_comment_entity_to_cluster_units(replies: List[CommentEntity], post_id: PyObjectId, cluster_entity: ClusterEntity, cluster_unit_entities=List[ClusterUnitEntity]):
        """recursively calls until there are no more replies left to convert into cluster_unit entities"""
        for reply in replies:
            cluster_unit_entities.append(ClusterUnitEntity.from_comment(reply, cluster_entity.id, post_id))
            if reply.replies:
                ClusterPrepService.convert_comment_entity_to_cluster_units(reply.replies, post_id, cluster_entity, cluster_unit_entities)



    @staticmethod
    def convert_cluster_units_to_bertopic_ready_documents(scraper_cluster_entity: ScraperClusterEntity) -> List:#[response]:
        cluster_unit_entities = get_cluster_unit_repository().find({"cluster_entity_id": scraper_cluster_entity.cluster_entity_id})
        returnable_entities = [cluster_unit_entity.model_dump() for cluster_unit_entity in cluster_unit_entities]
        return returnable_entities
    
    @staticmethod
    def enrich_cluster_units(scraper_cluster_entity: ScraperClusterEntity):
        cluster_unit_entities = get_cluster_unit_repository().find({"cluster_entity_id": scraper_cluster_entity.cluster_entity_id})
        # TODO rewrite the cluster unit using the conversation thread into a problem statement / frustration 
        # TODO have an LLM decide whether the user text is a [problem_description, frustration, alternative solution, none of the above]
        """
        You are scoring whether the final commenter on Reddit is stating a problem, frustration, alternative solution or none of the above. 
        It is your task to determine whether the redditor is 
        """

        """
        # Instructions
        You are scoring whether the final commenter on Reddit is also experiencing a problem or a frustration of any kind. (TRUE/FALSE) 
        Your will see the conversation thread of the final commenter that the redditor has replied to, state with TRUE/FALSE whether the user is experiencing it themselves.
        It is important to evaluate from the perspective of the final redditor. 

        ### Post + reply thread

        ### Redditor comment to evaluate

        ### Expected response
        TRUE/FALSE
        """




        






