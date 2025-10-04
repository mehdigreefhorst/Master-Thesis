
from enum import Enum


class StatusType(str, Enum):
    Initialized = "initialized"
    Ongoing = "ongoing"
    Paused = "paused"
    Completed = "completed"
    Error = "error"