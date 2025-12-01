
from enum import Enum


class StatusType(str, Enum):
    Initialized = "initialized"
    Ongoing = "ongoing"
    Paused = "paused"
    Completed = "completed"
    Error = "error"


class MediaStrategySkipType(str, Enum):
    SkipUnits = "skip_units" # 90% # Only skip the units with attribute "has_media"  (replies to this one will still be accepted) # Lightest version of skipping
    SkipPostsUnits = "skip_posts_units" # 30% # skips all units with attribute = has_media & skips all posts including its comments   # second most extreme version of skipping
    SkipThreadUnits = "skip_thread_units" # 25% # skips all units and its replies/comments with attribute = has_media   # most extreme version of skipping
    Ignore = "ignore" # 100% # no skipping at all 
    Enrich = "enrich" # This one doesn not skip, but not implementedis for the future!