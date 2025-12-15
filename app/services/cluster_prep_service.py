

import random
from typing import List, Literal

from flask import Response, jsonify
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
    def prepare_cluster_entity(scraper_cluster_entity: ScraperClusterEntity, media_strategy_skip_type: MediaStrategySkipType, text_thread_mode=ClusterTextThreadModeType.LlmParsedText) -> ClusterEntity:
        logger.info(f"[prepare_cluster_entity] Starting: scraper_cluster_id={scraper_cluster_entity.id}, media_strategy={media_strategy_skip_type}, text_thread_mode={text_thread_mode}")

        scraper_entity = get_scraper_repository().find_by_id(scraper_cluster_entity.scraper_entity_id)
        post_entity_ids = scraper_entity.get_all_post_entity_ids()

        logger.info(f"[prepare_cluster_entity] Retrieved {len(post_entity_ids)} post entities from scraper_entity_id={scraper_entity.id}")

        # should I gather the cluster_unit_ids that have the post_ids or always recreate new cluster_unit_ids
        # For the final product I would check whether they are already available
        # But for the thesis, I might want to iterate with different prompts while still maintaining prior ones.
        # So better for the testing phase that we are in, to create new ones.
        cluster_entity = ClusterEntity.from_params(
            scraper_entity_id= scraper_entity.id,
            media_strategy_skip_type=media_strategy_skip_type,
            text_thread_mode= text_thread_mode,
            post_entity_ids= post_entity_ids
        )
        logger.info(f"[prepare_cluster_entity] Created cluster_entity with id={cluster_entity.id}")
        return cluster_entity
    
    @staticmethod
    def get_or_create_cluster_entity(scraper_cluster_entity: ScraperClusterEntity, media_strategy_skip_type: MediaStrategySkipType) -> ClusterEntity:
        """creates the cluster entity if it is not assigned yet. Also updates the database"""
        logger.info(f"[get_or_create_cluster_entity] Starting for scraper_cluster_id={scraper_cluster_entity.id}")

        if not scraper_cluster_entity.cluster_entity_id:
            cluster_entity = ClusterPrepService.prepare_cluster_entity(scraper_cluster_entity, media_strategy_skip_type)
            scraper_cluster_entity.cluster_entity_id = cluster_entity.id
            logger.info(f"[get_or_create_cluster_entity] Creating new cluster entity with id={cluster_entity.id}")
            get_cluster_repository().insert(cluster_entity)
            get_scraper_cluster_repository().update(scraper_cluster_entity.id, {"cluster_entity_id": cluster_entity.id})
            return cluster_entity
        else:
            cluster_entity = get_cluster_repository().find_by_id(scraper_cluster_entity.cluster_entity_id)
                            
            logger.info(f"[get_or_create_cluster_entity] Using existing cluster entity with id={cluster_entity.id}")

            return cluster_entity

    @staticmethod
    def start_preparing_clustering(scraper_cluster_entity: ScraperClusterEntity, media_strategy_skip_type: MediaStrategySkipType) -> int:
        """Converts the found posts into cluster units. It checks whether a post is already converted, if so it skips it
        normally this is never the case, but happened frequently during testing. Also if it goes wrong, we can restart it so it is good to have"""
        logger.info(f"[start_preparing_clustering] Starting for scraper_cluster_id={scraper_cluster_entity.id}, media_strategy={media_strategy_skip_type}")

        cluster_entity = ClusterPrepService.get_or_create_cluster_entity(scraper_cluster_entity, media_strategy_skip_type)

        if cluster_entity.media_strategy_skip_type != media_strategy_skip_type:
            logger.error(f"media_strategy_skip_type has changed since last cluster creation, before: {cluster_entity.media_strategy_skip_type}, now {media_strategy_skip_type}")
            cluster_entity.media_strategy_skip_type = media_strategy_skip_type
            
            deleted = get_cluster_unit_repository().delete_many_by_cluster_enity_id(cluster_entity.id)
            logger.info(f"deleted a total of {deleted} cluster units")
            get_cluster_repository().update(cluster_entity.id, {"media_strategy_skip_type": media_strategy_skip_type})


        # Retrieve all cluster units that have already been created
        all_previously_added_cluster_units = get_cluster_unit_repository().find({"cluster_entity_id": cluster_entity.id})
        previous_found_post_ids_set = set([cluster_unit.post_id for cluster_unit in all_previously_added_cluster_units])
        logger.info(f"[start_preparing_clustering] Found {len(all_previously_added_cluster_units)} existing cluster units from {len(previous_found_post_ids_set)} different posts")

        all_inserted_cluster_unit_entities = [] # contains only a list of the inserted ids
        total_posts = len(cluster_entity.post_entity_ids_prep_status)
        processed_count = 0

        for post_id, post_prep_status  in cluster_entity.post_entity_ids_prep_status.items():
            processed_count += 1
            logger.info(f"[start_preparing_clustering] Processing post {processed_count}/{total_posts}: post_id={post_id}, status={post_prep_status}")

            if post_prep_status == StatusType.Initialized:
                if post_id in previous_found_post_ids_set:
                    logger.info(f"[start_preparing_clustering] Skipping already converted post: post_id={post_id}")
                    continue
                inserted_cluster_unit_entities = ClusterPrepService.convert_post_entity_to_cluster_units(cluster_entity, post_id, cluster_entity.media_strategy_skip_type)
                all_inserted_cluster_unit_entities.extend(inserted_cluster_unit_entities)
                logger.info(f"[start_preparing_clustering] Created {len(inserted_cluster_unit_entities)} cluster units for post_id={post_id}")
            elif post_prep_status == StatusType.Ongoing:
                # TODO what do we do here, it is probably not finished correctly?
                logger.error(f"[start_preparing_clustering] Post in ongoing state: cluster_entity_id={cluster_entity.id}, post_id={post_id}")
                raise Exception(f"We are with {cluster_entity.id} in a problem with post: {post_id} | we are ongoing???")
            elif post_prep_status == StatusType.Completed:
                logger.info(f"[start_preparing_clustering] Post already completed: cluster_entity_id={cluster_entity.id}, post_id={post_id}")
            else:
                logger.error(f"[start_preparing_clustering] Unknown post status: cluster_entity_id={cluster_entity.id}, post_id={post_id}, status={post_prep_status}")

        logger.info(f"[start_preparing_clustering] Completed: scraper_cluster_id={scraper_cluster_entity.id}, total_cluster_units_created={len(all_inserted_cluster_unit_entities)}")
        return len(all_inserted_cluster_unit_entities)

    @staticmethod
    def convert_post_entity_to_cluster_units(cluster_entity: ClusterEntity, post_id: PyObjectId, media_strategy_skip_type: MediaStrategySkipType) -> List[PyObjectId]:
        post_entity = get_post_repository().find_by_id(post_id)
        logger.info(f"[convert_post_entity_to_cluster_units] Converting post_id={post_entity.id}, has_media={post_entity.has_media()}, comments_count={len(post_entity.comments)}")

        # First we add the post as text by itself. since it is already valuable. Should we also add metadata of the replies/ comments?
        cluster_unit_entities: List[ClusterUnitEntity] = []

        # skip the whole thread if post has media and that MediaStrategySkipType in SkipPostsUnits, SkipThreadUnits
        if post_entity.has_media():
            if media_strategy_skip_type == MediaStrategySkipType.SkipPostsUnits or media_strategy_skip_type == MediaStrategySkipType.SkipThreadUnits:
                logger.info(f"[convert_post_entity_to_cluster_units] Skipping post with media: post_id={post_entity.id}, media_strategy={media_strategy_skip_type}")
                return []

        cluster_unit_entity_post = ClusterUnitEntity.from_post(post_entity, cluster_entity.id)
        cluster_unit_entities.append(cluster_unit_entity_post)

        # now we loop over each comment. To convert them into cluster unit entities. It also takes care of the replies
        skipped_comments = 0
        for comment in post_entity.comments:
            # Skip the whole thread below a has media type
            if comment.has_media() and media_strategy_skip_type == MediaStrategySkipType.SkipThreadUnits:
                skipped_comments += 1
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

        if skipped_comments > 0:
            logger.info(f"[convert_post_entity_to_cluster_units] Skipped {skipped_comments} comments with media for post_id={post_entity.id}")

        logger.info(f"[convert_post_entity_to_cluster_units] Created {len(cluster_unit_entities)} cluster units for post_id={post_entity.id}")

        cluster_unit_entities_remain = ClusterPrepService.process_cluster_units_media_type(cluster_unit_entities, media_strategy_skip_type)
        filtered_count = len(cluster_unit_entities) - len(cluster_unit_entities_remain)

        if filtered_count > 0:
            logger.info(f"[convert_post_entity_to_cluster_units] Media filtering reduced units by {filtered_count} for post_id={post_entity.id}")

        if cluster_unit_entities_remain:
            # we must store the inserted_ids first in this variable. Some issue pertains to the object lifetime if we chain
            # the result of the insertMany
            inserted_ids = get_cluster_unit_repository().insert_list_entities(cluster_unit_entities_remain).inserted_ids
            logger.info(f"[convert_post_entity_to_cluster_units] Inserted {len(inserted_ids)} cluster units into database for post_id={post_entity.id}")
            return inserted_ids
        else:
            logger.warning(f"[convert_post_entity_to_cluster_units] No cluster units remained after filtering for post_id={post_entity.id}")
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
        media_strategy_skip_type: MediaStrategySkipType):
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
        logger.info(f"[convert_cluster_units_to_bertopic_ready_documents] Starting: scraper_cluster_id={scraper_cluster_entity.id}, message_type={reddit_message_type}")

        if reddit_message_type == "all":
            cluster_unit_entities = get_cluster_unit_repository().find({"cluster_entity_id": scraper_cluster_entity.cluster_entity_id})
        else:
            cluster_unit_entities = get_cluster_unit_repository().find({"cluster_entity_id": scraper_cluster_entity.cluster_entity_id,
                                                                        "type": reddit_message_type})
            cluster_unit_entities = sorted(cluster_unit_entities, key=lambda x: x.upvotes, reverse=True)

        logger.info(f"[convert_cluster_units_to_bertopic_ready_documents] Retrieved {len(cluster_unit_entities)} cluster units for scraper_cluster_id={scraper_cluster_entity.id}")

        returnable_entities = [cluster_unit_entity.model_dump() for cluster_unit_entity in cluster_unit_entities]
        return returnable_entities
    
    @staticmethod
    def process_cluster_units_media_type(cluster_unit_entities: List[ClusterUnitEntity], media_strategy_skip_type: MediaStrategySkipType):
        logger.info(f"[process_cluster_units_media_type] Processing {len(cluster_unit_entities)} units with media_strategy={media_strategy_skip_type}")

        if media_strategy_skip_type == MediaStrategySkipType.SkipUnits:
            filtered = [unit for unit in cluster_unit_entities if not unit.includes_media]
            logger.info(f"[process_cluster_units_media_type] SkipUnits: Filtered from {len(cluster_unit_entities)} to {len(filtered)} units")
            return filtered
        elif media_strategy_skip_type == MediaStrategySkipType.SkipPostsUnits:
            # Implemented throughout the converting process
            units_with_media = [unit for unit in cluster_unit_entities if unit.type == "post" and unit.includes_media]
            if units_with_media:
                logger.error(f"[process_cluster_units_media_type] SkipPostsUnits validation failed: {len(units_with_media)} post units with media found")
                raise Exception("There should not be any cluster units with media left")
            logger.info(f"[process_cluster_units_media_type] SkipPostsUnits: Validation passed, returning {len(cluster_unit_entities)} units")
            return cluster_unit_entities
        elif media_strategy_skip_type == MediaStrategySkipType.SkipThreadUnits:
            # Implemented throughout the converting process
            units_with_media = [unit for unit in cluster_unit_entities if unit.includes_media]
            if units_with_media:
                logger.error(f"[process_cluster_units_media_type] SkipThreadUnits validation failed: {len(units_with_media)} units with media found")
                raise Exception("There should not be any cluster units with media left")
            logger.info(f"[process_cluster_units_media_type] SkipThreadUnits: Validation passed, returning {len(cluster_unit_entities)} units")
            return cluster_unit_entities
        elif media_strategy_skip_type == MediaStrategySkipType.Ignore:
            logger.info(f"[process_cluster_units_media_type] Ignore: Returning all {len(cluster_unit_entities)} units without filtering")
            return cluster_unit_entities
        elif media_strategy_skip_type == MediaStrategySkipType.Enrich:
            logger.error(f"[process_cluster_units_media_type] Enrich strategy not implemented")
            raise Exception("Enriching is not implemented")
        else:
            logger.error(f"[process_cluster_units_media_type] Unknown media strategy: {media_strategy_skip_type}")
            raise Exception(f"No known media strategy skip type is used = {media_strategy_skip_type}")
        
    @staticmethod
    def enrich_cluster_units(scraper_cluster_entity: ScraperClusterEntity):
        logger.info(f"[enrich_cluster_units] Starting enrichment for scraper_cluster_id={scraper_cluster_entity.id}")

        cluster_unit_entities = get_cluster_unit_repository().find({"cluster_entity_id": scraper_cluster_entity.cluster_entity_id})
        logger.info(f"[enrich_cluster_units] Retrieved {len(cluster_unit_entities)} cluster units for enrichment")

        # TODO rewrite the cluster unit using the conversation thread into a problem statement / frustration
        # TODO have an LLM decide whether the user text is a [problem_description, frustration, alternative solution, none of the above]
        logger.warning(f"[enrich_cluster_units] Enrichment logic not yet implemented - method is a placeholder")
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

    @staticmethod
    def get_cluster_unit_ids_for_sample(picked_posts_cluster_unit_ids: List[PyObjectId], sample_size: int, cluster_entity: ClusterEntity) -> List[PyObjectId] | Response:
        """gets all the cluster unit ids from the database. set sample_size = -1, to take everything"""
        selected_cluster_units = get_cluster_unit_repository().find_many_by_ids(picked_posts_cluster_unit_ids)
        selected_cluster_unit_post_ids = [cluster_unit.post_id for cluster_unit in selected_cluster_units]

        filter = {"post_id": {"$in": selected_cluster_unit_post_ids}, "cluster_entity_id": cluster_entity.id}
        # only skip media when the mediastrategyskip type is ignore
        if cluster_entity.media_strategy_skip_type != MediaStrategySkipType.Ignore:
            filter["includes_media"] = False
        
        filter["text"] = {"$nin": ["[REMOVED]", "[removed]", "[DELETED]", "[deleted]"]}
        cluster_unit_ids_with_corresponding_post_id = get_cluster_unit_repository().find_ids(filter)
        if len(cluster_unit_ids_with_corresponding_post_id) < sample_size:
            logger.error(f"Sample size = {sample_size}, but only {len(cluster_unit_ids_with_corresponding_post_id)} cluster units")   
            return jsonify(error=f"Not enough cluster units. Found {len(cluster_unit_ids_with_corresponding_post_id)} but need {sample_size}"), 400
        
        # if sample_size is -1 take the whole sample
        if sample_size == -1:
            return cluster_unit_ids_with_corresponding_post_id
        sample_cluster_unit_ids = random.sample(cluster_unit_ids_with_corresponding_post_id, sample_size)
        # randomly select body.sample_size cluster units from here. 
        return sample_cluster_unit_ids




        






