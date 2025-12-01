

from typing import List, Literal
from app.database.entities.base_entity import PyObjectId
from app.database.entities.cluster_entity import ClusterEntity, ClusterTextThreadModeType
from app.database.entities.cluster_unit_entity import ClusterUnitEntity
from app.database.entities.post_entity import CommentEntity
from app.database.entities.scraper_cluster_entity import ScraperClusterEntity
from app.database.entities.scraper_entity import ScraperEntity
from app.database import get_cluster_repository, get_cluster_unit_repository, get_post_repository, get_scraper_cluster_repository, get_scraper_repository
from app.utils.logging_config import get_logger
from app.utils.types import MediaStrategySkipType, StatusType


logger = get_logger(__name__)


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
            logger.info(f"creating a new cluster entity since we don't have one with id {cluster_entity.id}")
            get_cluster_repository().insert(cluster_entity)
            get_scraper_cluster_repository().update(scraper_cluster_entity.id, {"cluster_entity_id": cluster_entity.id})
            return cluster_entity
        else:
            cluster_entity = get_cluster_repository().find_by_id(scraper_cluster_entity.cluster_entity_id)
            logger.info(f"Retrieving already existing cluster entity since we have one with id {cluster_entity.id}")

            return cluster_entity

    @staticmethod
    def start_preparing_clustering(scraper_cluster_entity: ScraperClusterEntity, media_strategy_skip_type: MediaStrategySkipType = MediaStrategySkipType.Ignore) -> int:
        """Converts the found posts into cluster units. It checks whether a post is already converted, if so it skips it
        normally this is never the case, but happened frequently during testing. Also if it goes wrong, we can restart it so it is good to have"""
        cluster_entity = ClusterPrepService.get_or_create_cluster_entity(scraper_cluster_entity)

        # Retrieve all cluster units that have already been created
        all_previously_added_cluster_units = get_cluster_unit_repository().find({"cluster_entity_id": cluster_entity.id})
        previous_found_post_ids_set = set([cluster_unit.post_id for cluster_unit in all_previously_added_cluster_units])
        logger.info(f"we have {len(all_previously_added_cluster_units)} already existing cluster units, from {len(previous_found_post_ids_set)} different posts")
        all_inserted_cluster_unit_entities = [] # contains only a list of the inserted ids
        for post_id, post_prep_status  in cluster_entity.post_entity_ids_prep_status.items():
            print("processing post_id = ", post_id)
            if post_prep_status == StatusType.Initialized:
                if post_id in previous_found_post_ids_set:
                    continue
                inserted_cluster_unit_entities = ClusterPrepService.convert_post_entity_to_cluster_units(cluster_entity, post_id, media_strategy_skip_type)
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
    def convert_post_entity_to_cluster_units(cluster_entity: ClusterEntity, post_id: PyObjectId, media_strategy_skip_type: MediaStrategySkipType = MediaStrategySkipType.Ignore) -> List[PyObjectId]:
        post_entity = get_post_repository().find_by_id(post_id)
        logger.info(f"converting post {post_entity.id} into cluster units")
        # First we add the post as text by itself. since it is already valuable. Should we also add metadata of the replies/ comments?
        cluster_unit_entities: List[ClusterUnitEntity] = []


        # skp the whole thread if post has media and that MediaStrategySkipType in SkipPostsUnits, SkipThreadUnits
        if post_entity.has_media():
            if media_strategy_skip_type == MediaStrategySkipType.SkipPostsUnits or media_strategy_skip_type == MediaStrategySkipType.SkipThreadUnits:
                return []
        
        cluster_unit_entity_post = ClusterUnitEntity.from_post(post_entity, cluster_entity.id)
        cluster_unit_entities.append(cluster_unit_entity_post)
        # now we loop over each comment. To convert them into cluster unit entities. It also takes care of the replies
        for comment in post_entity.comments:
            # Skip the whole thread below a has media type 
            if comment.has_media() and media_strategy_skip_type == MediaStrategySkipType.SkipThreadUnits:
                continue
            cluster_unit_entity = ClusterUnitEntity.from_comment(
                comment_entity=comment, 
                cluster_entity_id=cluster_entity.id, 
                post_id=post_id,
                post_permalink=post_entity.permalink,
                subreddit=post_entity.subreddit, 
                reply_to_cluster_unit=cluster_unit_entity_post)
            cluster_unit_entities.append(cluster_unit_entity)
            comment_index = len(cluster_unit_entities) -1
            if comment.replies:
                ClusterPrepService.convert_comment_entity_to_cluster_units(
                    replies=comment.replies, 
                    post_id=post_id, 
                    post_permalink=post_entity.permalink,
                    cluster_entity=cluster_entity, 
                    cluster_unit_entities=cluster_unit_entities,
                    subreddit=post_entity.subreddit,
                    reply_to_cluster_unit=cluster_unit_entity,
                    media_strategy_skip_type=media_strategy_skip_type)
            
            cluster_unit_entities[comment_index].total_nested_replies = len(cluster_unit_entities) - comment_index - 1 
        
        cluster_unit_entities[0].total_nested_replies = len(cluster_unit_entities) - 1
        logger.info(f"Created a total of {len(cluster_unit_entities)} for this post")
        
        cluster_unit_entities_remain = ClusterPrepService.process_cluster_units_media_type(cluster_unit_entities, media_strategy_skip_type)
        logger.info(f" filtering resulted in reduction of {len(cluster_unit_entities) - len (cluster_unit_entities_remain)} for this post")
        if cluster_unit_entities_remain:
            # we must store the inserted_ids first in this variable. SOme issue pertains to the object liftime if we chain
            # the result of the insertMany
            inserted_ids = get_cluster_unit_repository().insert_list_entities(cluster_unit_entities_remain).inserted_ids
            return inserted_ids
        else:
            return []
    @staticmethod
    def convert_comment_entity_to_cluster_units(
        replies: List[CommentEntity], 
        post_id: PyObjectId,
        post_permalink: str,
        cluster_entity: ClusterEntity, 
        cluster_unit_entities:List[ClusterUnitEntity], 
        subreddit: str,
        reply_to_cluster_unit: ClusterUnitEntity,
        media_strategy_skip_type: MediaStrategySkipType = MediaStrategySkipType.Ignore):
        """recursively calls until there are no more replies left to convert into cluster_unit entities"""
        for reply in replies:
            if reply.has_media() and media_strategy_skip_type == MediaStrategySkipType.SkipThreadUnits:
                continue
            cluster_unit_entity = ClusterUnitEntity.from_comment(
                comment_entity=reply, 
                cluster_entity_id=cluster_entity.id, 
                post_id=post_id, 
                subreddit=subreddit, 
                post_permalink=post_permalink,
                reply_to_cluster_unit=reply_to_cluster_unit
                )
            cluster_unit_entities.append(cluster_unit_entity)
            reply_index = len(cluster_unit_entities) -1
            if reply.replies:
                ClusterPrepService.convert_comment_entity_to_cluster_units(
                    replies=reply.replies, 
                    post_id=post_id, 
                    post_permalink=post_permalink,
                    cluster_entity=cluster_entity, 
                    cluster_unit_entities=cluster_unit_entities, 
                    subreddit=subreddit, 
                    reply_to_cluster_unit=cluster_unit_entity,
                    media_strategy_skip_type=media_strategy_skip_type)

            cluster_unit_entities[reply_index].total_nested_replies = len(cluster_unit_entities) - reply_index - 1


    @staticmethod
    def convert_cluster_units_to_bertopic_ready_documents(scraper_cluster_entity: ScraperClusterEntity, reddit_message_type: Literal["post", "comment", "all"] = "all") -> List:#[response]:
        if reddit_message_type == "all":
            cluster_unit_entities = get_cluster_unit_repository().find({"cluster_entity_id": scraper_cluster_entity.cluster_entity_id})
        else:
            cluster_unit_entities = get_cluster_unit_repository().find({"cluster_entity_id": scraper_cluster_entity.cluster_entity_id, 
                                                                        "type": reddit_message_type})
            cluster_unit_entities = sorted(cluster_unit_entities, key=lambda x: x.upvotes, reverse=True)
        returnable_entities = [cluster_unit_entity.model_dump() for cluster_unit_entity in cluster_unit_entities]
        return returnable_entities
    
    @staticmethod
    def process_cluster_units_media_type(cluster_unit_entities: List[ClusterUnitEntity], media_strategy_skip_type: MediaStrategySkipType = MediaStrategySkipType.Ignore):
        if media_strategy_skip_type == MediaStrategySkipType.SkipUnits:
            return [unit for unit in cluster_unit_entities if not unit.includes_media]
        elif media_strategy_skip_type == MediaStrategySkipType.SkipPostsUnits:
            # Implemented throughout the converting process
            if [unit for unit in cluster_unit_entities if  unit.type == "post" and unit.includes_media]:
                raise Exception("There should not be any cluster units with media left")
            return cluster_unit_entities
        elif media_strategy_skip_type == MediaStrategySkipType.SkipThreadUnits:
            # Implemented throughout the converting process
            if [unit for unit in cluster_unit_entities if  unit.includes_media]:
                raise Exception("There should not be any cluster units with media left")
            return cluster_unit_entities
        elif media_strategy_skip_type == MediaStrategySkipType.Ignore:
            return cluster_unit_entities
        elif media_strategy_skip_type == MediaStrategySkipType.Enrich:
            raise Exception("Enriching is not implemented")
        else:
            raise Exception(f"No known media strategy skip type is used = {media_strategy_skip_type}")
        
    
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




        






