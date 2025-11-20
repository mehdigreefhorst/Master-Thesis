# app/utils/rate_limiter.py
import asyncio
import time
from collections import deque
from typing import Dict, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

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
        self.lock = asyncio.Lock()  # This lock ensures thread-safe access
        
        # Metrics
        self.total_requests = 0
        self.throttled_count = 0
        self.total_wait_time = 0.0
    
    async def acquire(self) -> float:
        """
        Acquire permission to make a request.
        This method is called by ALL coroutines and they coordinate through the lock.
        """
        start_time = time.time()
        wait_time = 0.0
        
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
                logger.debug(f"Rate limit reached ({len(self.request_times)}/{self.config.requests_per_minute}), "
                           f"waiting {wait_time:.2f}s")
            
            # Check per-second limit
            elif self.config.requests_per_second:
                recent_cutoff = now - 1
                recent_requests = sum(1 for t in self.request_times if t > recent_cutoff)
                
                if recent_requests >= self.config.requests_per_second:
                    wait_time = 1.0 / self.config.requests_per_second
                    logger.debug(f"Per-second limit reached, waiting {wait_time:.2f}s")
            
            # If we need to wait, do it
            if wait_time > 0:
                await asyncio.sleep(wait_time)
                now = time.time()
            
            # Record this request
            self.request_times.append(now)
            self.total_requests += 1
            
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

class RateLimitError(Exception):
    def __init__(self, retry_after: Optional[float] = None):
        self.retry_after = retry_after

@backoff.on_exception(
    backoff.expo,
    RateLimitError,
    max_tries=5,
    max_time=300
)
async def call_with_retry(api_func, *args, **kwargs):
    try:
        response = await api_func(*args, **kwargs)
        return response
    except Exception as e:
        if hasattr(e, 'response'):
            if e.response.status_code == 429:  # Too Many Requests
                retry_after = e.response.headers.get('Retry-After', 10)
                logging.warning(f"Hit rate limit, retry after {retry_after}s")
                await asyncio.sleep(float(retry_after))
                raise RateLimitError(retry_after)
        raise