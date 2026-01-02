# app/utils/rate_limiter.py
import asyncio
import time
from collections import deque
from typing import Dict, Optional
from dataclasses import dataclass

from app.utils.logging_config import get_logger

# Initialize logger for this module
logger = get_logger(__name__)

@dataclass
class RateLimitConfig:
    requests_per_minute: int = 60
    requests_per_second: Optional[int] = None
    burst_capacity: Optional[int] = None
    
    def __post_init__(self):
        if self.requests_per_second is None:
            self.requests_per_second = max(1, self.requests_per_minute / 60)
        if self.burst_capacity is None:
            self.burst_capacity = min(10, self.requests_per_minute // 6)

class RateLimiterRegistry:
    """
    Singleton registry for rate limiters.
    Ensures all coroutines share the same rate limiter instances.
    """
    _instance = None
    _rate_limiters: Dict[str, 'OpenRouterRateLimiter'] = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    def get_limiter(cls, api_key: str, config: Optional[RateLimitConfig] = None) -> 'OpenRouterRateLimiter':
        """Get or create a rate limiter for an API key"""
        instance = cls()
        
        if api_key not in cls._rate_limiters:
            if config is None:
                config = RateLimitConfig(requests_per_minute=60)
            cls._rate_limiters[api_key] = OpenRouterRateLimiter(config)
            logger.info(f"Created new rate limiter for API key ending in ...{api_key[-4:]}")
        
        return cls._rate_limiters[api_key]
    
    @classmethod
    def get_metrics(cls) -> Dict:
        """Get metrics for all rate limiters"""
        instance = cls()
        return {
            api_key[-4:]: limiter.get_metrics() 
            for api_key, limiter in cls._rate_limiters.items()
        }

class OpenRouterRateLimiter:
    """Rate limiter that's shared across all coroutines"""

    def __init__(self, config: RateLimitConfig):
        self.config = config
        self.request_times = deque()
        self._lock = None  # Will be lazily initialized in the correct event loop
        self._lock_loop = None  # Track which event loop the lock belongs to

        # Metrics
        self.total_requests = 0
        self.throttled_count = 0
        self.total_wait_time = 0.0

        # Aggregate logging
        self.last_log_time = time.time()
        self.requests_since_last_log = 0
        self.throttled_since_last_log = 0
        self.log_interval_seconds = 10  # Log summary every 10 seconds

    @property
    def lock(self):
        """Lazy initialization of lock to ensure it's created in the correct event loop"""
        try:
            current_loop = asyncio.get_running_loop()
        except RuntimeError:
            # No running loop, create lock anyway
            if self._lock is None:
                self._lock = asyncio.Lock()
            return self._lock

        # Check if we're in a different event loop than when the lock was created
        if self._lock is None or self._lock_loop is not current_loop:
            self._lock = asyncio.Lock()
            self._lock_loop = current_loop
            logger.debug(f"Created new lock for event loop {id(current_loop)}")

        return self._lock

    def reset_lock(self):
        """Reset the lock - useful when entering a new event loop"""
        self._lock = None
        self._lock_loop = None
    
    async def acquire(self) -> float:
        """
        Acquire permission to make a request.
        This method is called by ALL coroutines and they coordinate through the lock.
        """
        start_time = time.time()
        wait_time = 0.0
        was_throttled = False

        # This lock ensures only one coroutine modifies the rate limiter at a time
        async with self.lock:
            now = time.time()

            # Clean old requests (older than 60 seconds)
            cutoff = now - 60
            while self.request_times and self.request_times[0] < cutoff:
                self.request_times.popleft()

            # Check if we're at the per-minute limit
            if len(self.request_times) >= self.config.requests_per_minute:
                # Calculate how long to wait for the oldest request to expire
                wait_time = (self.request_times[0] + 60) - now
                self.throttled_count += 1
                was_throttled = True
                # Removed individual debug log

            # Check per-second limit
            elif self.config.requests_per_second:
                recent_cutoff = now - 1
                recent_requests = sum(1 for t in self.request_times if t > recent_cutoff)

                if recent_requests >= self.config.requests_per_second:
                    wait_time = 1.0 / self.config.requests_per_second
                    was_throttled = True
                    # Removed individual debug log

            # If we need to wait, do it
            if wait_time > 0:
                await asyncio.sleep(wait_time)
                now = time.time()

            # Record this request
            self.request_times.append(now)
            self.total_requests += 1
            self.requests_since_last_log += 1
            if was_throttled:
                self.throttled_since_last_log += 1

            # Aggregate logging - log summary periodically
            time_since_last_log = now - self.last_log_time
            if time_since_last_log >= self.log_interval_seconds:
                throttle_rate = (self.throttled_since_last_log / max(1, self.requests_since_last_log)) * 100
                logger.info(
                    f"Rate limiter summary (last {time_since_last_log:.1f}s): "
                    f"{self.requests_since_last_log} requests, "
                    f"{self.throttled_since_last_log} throttled ({throttle_rate:.1f}%), "
                    f"queue size: {len(self.request_times)}/{self.config.requests_per_minute}"
                )
                # Reset counters
                self.last_log_time = now
                self.requests_since_last_log = 0
                self.throttled_since_last_log = 0

        # Calculate total time spent in this method
        actual_wait = time.time() - start_time
        self.total_wait_time += actual_wait

        return actual_wait
    
    def get_metrics(self) -> Dict:
        """Get current metrics"""
        with_lock = self.lock.locked()
        return {
            'total_requests': self.total_requests,
            'throttled_count': self.throttled_count,
            'throttle_rate': self.throttled_count / max(1, self.total_requests),
            'avg_wait_time': self.total_wait_time / max(1, self.total_requests),
            'current_queue_size': len(self.request_times),
            'lock_held': with_lock
        }
    


import backoff
import re

async def call_with_retry(api_func, *args, max_tries: int = 5, **kwargs):
    """
    Call API function with retry only on rate limit errors (429).

    Args:
        api_func: Async function to call
        max_tries: Max retry attempts (None = unlimited for test mode, 5 = default production)
        **kwargs: Arguments for api_func

    Returns:
        Response from api_func (original exception propagates if not rate limit)
    """

    def should_give_up(e):
        """Only retry on 429 rate limit errors, give up on everything else"""
        error_message = str(e)
        is_rate_limit = "429" in error_message or "rate limit" in error_message.lower()
        return not is_rate_limit  # Give up if NOT a rate limit error

    async def _on_backoff(details):
        """Called before each retry - extract reset time and wait"""
        e = details['exception']
        error_message = str(e)

        # Extract X-RateLimit-Reset from error (Unix timestamp in milliseconds)
        reset_match = re.search(r"'X-RateLimit-Reset':\s*'?(\d+)'?", error_message)

        if reset_match:
            reset_timestamp_ms = int(reset_match.group(1))
            reset_timestamp_s = reset_timestamp_ms / 1000
            current_time = time.time()
            retry_after = max(1, reset_timestamp_s - current_time + 1)

            reset_time_str = time.strftime('%H:%M:%S', time.localtime(reset_timestamp_s))
            logger.warning(f"Rate limit hit. Waiting {retry_after:.1f}s until reset at {reset_time_str}")
            await asyncio.sleep(retry_after)
        else:
            logger.warning(f"Rate limit hit (attempt {details['tries']}). Using exponential backoff.")

    # Build backoff decorator with dynamic max_tries
    # Production: limited retries
    decorator = backoff.on_exception(
        backoff.expo,
        Exception,  # Catch all exceptions
        giveup=should_give_up,  # But only retry rate limits
        on_backoff=_on_backoff,
        max_tries=max_tries,
        max_time=300
    )

    # Apply decorator and call
    decorated_func = decorator(lambda: api_func(*args, **kwargs))
    return await decorated_func()
