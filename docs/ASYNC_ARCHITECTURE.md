# Async Architecture & Rate Limiting Explained

This document explains the asynchronous architecture, rate limiting, and concurrency control mechanisms in the experiment service.

## Table of Contents
1. [Overview](#overview)
2. [Key Components](#key-components)
3. [The Request Flow](#the-request-flow)
4. [Semaphore vs Rate Limiter](#semaphore-vs-rate-limiter)
5. [Rate Limiter Implementation](#rate-limiter-implementation)
6. [Logging Strategy](#logging-strategy)

---

## Overview

When running an experiment with 250 cluster units and 3 runs per unit, we need to make **750 API requests** to OpenRouter. The system uses:

- **Async/await**: For concurrent execution (not blocking)
- **Semaphore**: For concurrency control (max simultaneous requests)
- **Rate Limiter**: For API rate limit compliance (requests per minute)
- **Retry Logic**: For handling transient failures

These work together to maximize throughput while respecting API limits.

---

## Key Components

### 1. `predict_single_with_semaphore_and_retry` (experiment_service.py:80)

```python
async def predict_single_with_semaphore_and_retry(cluster_unit_entity, run_index):
    """
    Wrapper that ensures we don't have too many concurrent connections.
    The rate limiter (in LlmHelper) ensures we don't exceed API limits.
    Includes retry logic with exponential backoff.
    """
    all_attempts = []  # Track all attempts for token accounting

    async with semaphore:  # ← CONCURRENCY CONTROL
        for attempt in range(max_retries):
            try:
                result = await ExperimentService.predict_single_run_cluster_unit(...)
                return result
            except Exception as e:
                # Exponential backoff: 0s, 20s, 40s
                wait_time = 20 * attempt
                await asyncio.sleep(wait_time)
```

**What it does:**
- Controls how many requests run **simultaneously** (via semaphore)
- Implements retry logic with exponential backoff
- Tracks token usage across all attempts (including failures)

### 2. Rate Limiter (rate_limiters.py:60)

```python
class OpenRouterRateLimiter:
    """Shared rate limiter across all coroutines using the same API key"""

    async def acquire(self):
        """Wait until we're allowed to make a request"""
        async with self.lock:  # Only one coroutine can check/modify at a time
            # Remove old requests (>60 seconds ago)
            # Check if we've hit the limit (e.g., 60/minute)
            # If yes, calculate wait time
            # Sleep if needed
            # Record this request
```

**What it does:**
- Maintains a **sliding window** of request timestamps
- Ensures compliance with API rate limits (e.g., 60 requests/minute)
- Shared across **all coroutines** using the same API key

### 3. The Registry (rate_limiters.py:25)

```python
class RateLimiterRegistry:
    """Singleton registry ensuring all coroutines share rate limiters"""

    @classmethod
    def get_limiter(cls, api_key: str):
        if api_key not in cls._rate_limiters:
            cls._rate_limiters[api_key] = OpenRouterRateLimiter(config)
        return cls._rate_limiters[api_key]  # Same instance for all
```

**Why it exists:**
- Without a registry, each coroutine would create its own rate limiter
- Rate limiting only works if **everyone shares the same counter**
- The registry ensures a single rate limiter per API key

---

## The Request Flow

```
User starts experiment: 250 units × 3 runs = 750 total requests

┌─────────────────────────────────────────────────────────────┐
│ 1. asyncio.gather(*tasks)                                   │
│    Creates 750 async tasks, all start immediately           │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ 2. Semaphore (max_concurrent=1000)                          │
│    "Only 1000 tasks can be active at once"                  │
│    Controls: Memory usage, open connections                 │
│    Scope: Per experiment run                                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ 3. Rate Limiter (60 requests/minute)                        │
│    "Only 1 request per second on average"                   │
│    Controls: API rate limits                                │
│    Scope: Global (per API key)                              │
│    Shared: ALL experiments using this API key               │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ 4. LLM API Call (via AsyncOpenAI)                           │
│    await llm.chat.completions.create(...)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ 5. Token Extraction (NEVER fails)                           │
│    tokens = response.usage.to_dict()                        │
│    Stored immediately, even if parsing fails                │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ 6. Response Parsing (may fail → retry)                      │
│    prediction = json.loads(response.choices[0].message)     │
│    If fails: retry with exponential backoff                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Semaphore vs Rate Limiter

They serve **different purposes** and control **different bottlenecks**:

| Aspect               | **Semaphore**                    | **Rate Limiter**                |
|----------------------|----------------------------------|---------------------------------|
| **What it controls** | Concurrent connections           | Requests per time period        |
| **Question**         | "How many at once?"              | "How many per minute?"          |
| **Scope**            | Per experiment                   | Global (per API key)            |
| **Prevents**         | Overwhelming local system        | API rate limit errors (429)     |
| **Example**          | Max 1000 simultaneous requests   | Max 60 requests per 60 seconds  |
| **Location**         | `experiment_service.py:78`       | `rate_limiters.py:60`           |

### Why Both Are Needed

#### Scenario 1: Only Semaphore (no rate limiter)
```python
# 1000 concurrent requests start
# All hit OpenRouter API at the same time
# Result: 429 Too Many Requests ❌
```

#### Scenario 2: Only Rate Limiter (no semaphore)
```python
# 750 coroutines all start waiting at rate limiter
# Memory: 750 async contexts in memory
# Connections: Potentially 750 open connections
# Result: Inefficient resource usage ⚠️
```

#### Scenario 3: Both (current implementation)
```python
# Semaphore: Only 1000 active at once
# Rate Limiter: Spaces them out (1 per second)
# Result: Efficient + compliant ✓
```

### Visual Example

**Time: 0s**
```
Semaphore Queue: [1000 active] [500 waiting]
Rate Limiter: ✓ Allowing requests at 1/second
```

**Time: 30s**
```
Semaphore Queue: [1000 active] [470 waiting]
Rate Limiter: ✓ 30 requests completed, 30 in queue
```

**Time: 750s (12.5 minutes)**
```
Semaphore Queue: [0 active] [0 waiting]
Rate Limiter: ✓ All 750 requests completed
```

---

## Rate Limiter Implementation

### How the Sliding Window Works

The rate limiter uses a **sliding window** algorithm:

```python
self.request_times = deque([t1, t2, t3, ..., t60])
#                           ↑                   ↑
#                        oldest              newest

# At time T=65:
# 1. Remove all requests older than T-60 (i.e., older than t=5)
# 2. Check: len(request_times) < 60?
# 3. If yes: allow request, append T=65
# 4. If no: wait for oldest to expire
```

### Example Timeline

```
Minute 1: t=0s ──────────────────────────────────────── t=60s
Requests: [x x x x x x x x ... x x x]  (60 requests)
                                    ↑
                                 t=60: Request #61 arrives

Rate limiter checks:
- Oldest request: t=0
- Current time: t=60
- Window: [t=0 to t=60] = 60 seconds
- Count: 60 requests ❌ (at limit)
- Action: Wait until t=61 (when t=0 expires)

At t=61:
- Remove t=0 (older than t=1)
- Count: 59 requests ✓
- Allow request #61
```

### Lock Mechanism

```python
async with self.lock:
    # Only ONE coroutine can execute this block at a time
    # Others wait in line
```

**Why needed:**
- Multiple coroutines check the rate limiter simultaneously
- Without lock: Race condition (multiple think they're request #60)
- With lock: Serialized access, accurate counting

---

## Logging Strategy

### Problem: Log Overload

**Before:**
```python
# Every request that waits logs a message
if wait_time > 0.1:
    logger.info(f"Rate limited for {wait_time:.2f}s")

# Result: 750 log messages over 12.5 minutes
```

### Solution: Aggregate Logging

**After:**
```python
# Log summary every 10 seconds
if time_since_last_log >= 10:
    logger.info(
        f"Rate limiter summary (last 10.0s): "
        f"60 requests, 45 throttled (75.0%), "
        f"queue size: 60/60"
    )
```

**Benefits:**
- Reduces logs from ~750 to ~75 (10× reduction)
- Still provides visibility into rate limiting
- Shows aggregate statistics (throttle rate, queue size)

### Example Log Output

```
2025-11-26 14:23:10 INFO  [app.utils.rate_limiters] Rate limiter summary (last 10.1s):
  60 requests, 48 throttled (80.0%), queue size: 60/60

2025-11-26 14:23:20 INFO  [app.utils.rate_limiters] Rate limiter summary (last 10.0s):
  60 requests, 52 throttled (86.7%), queue size: 60/60

2025-11-26 14:23:30 INFO  [app.utils.rate_limiters] Rate limiter summary (last 10.0s):
  60 requests, 50 throttled (83.3%), queue size: 60/60
```

**Interpretation:**
- **60 requests**: 60 API calls made in this 10-second window
- **48 throttled (80%)**: 48 of those had to wait due to rate limiting
- **queue size: 60/60**: Currently at max capacity (rate limiter fully active)

---

## Configuration

### Adjusting Rate Limits

In `llm_helper.py:71-72`:

```python
requests_per_minute: Optional[int] = 1000,  # Max requests per minute
burst_capacity: Optional[int] = 25,         # Max burst size
```

**Recommendations:**
- **OpenRouter Free Tier**: `requests_per_minute=60`
- **OpenRouter Pro**: `requests_per_minute=300`
- **OpenRouter Enterprise**: `requests_per_minute=1000`

### Adjusting Concurrency

In `experiment_service.py:35`:

```python
max_concurrent: int = 1000  # Max simultaneous requests
```

**Recommendations:**
- **Small experiments (<100 units)**: `max_concurrent=100`
- **Medium experiments (100-500)**: `max_concurrent=500`
- **Large experiments (>500)**: `max_concurrent=1000`

### Adjusting Log Interval

In `rate_limiters.py:77`:

```python
self.log_interval_seconds = 10  # Log summary every 10 seconds
```

**Recommendations:**
- **Short experiments (<5 min)**: `log_interval_seconds=5`
- **Medium experiments (5-30 min)**: `log_interval_seconds=10`
- **Long experiments (>30 min)**: `log_interval_seconds=30`

---

## Troubleshooting

### Problem: Requests taking too long

**Diagnosis:**
```python
# Check rate limiter metrics
metrics = RateLimiterRegistry.get_metrics()
print(metrics)

# Output:
{
    '...key': {
        'throttle_rate': 0.85,  # 85% of requests throttled
        'avg_wait_time': 0.92,  # Average 920ms wait
    }
}
```

**Solutions:**
1. Increase `requests_per_minute` (if your plan allows)
2. Decrease `max_concurrent` (reduces queue pressure)
3. Add more API keys and distribute load

### Problem: 429 Rate Limit Errors

**Cause:** Rate limiter is configured too high for your plan

**Solution:**
```python
# Lower the rate limit
config = RateLimitConfig(
    requests_per_minute=30,  # Lower from 60
    burst_capacity=10        # Lower from 25
)
```

### Problem: High memory usage

**Cause:** Semaphore limit too high

**Solution:**
```python
# Lower max concurrent
max_concurrent = 100  # Lower from 1000
```

---

## Advanced Topics

### Token Accounting Across Retries

The system tracks tokens even when requests fail:

```python
# Attempt 1: Fails, uses 1000 tokens
all_attempts = [TokenUsageAttempt(tokens_used=1000, success=False)]

# Attempt 2: Fails, uses 1000 tokens
all_attempts.append(TokenUsageAttempt(tokens_used=1000, success=False))

# Attempt 3: Succeeds, uses 1000 tokens
all_attempts.append(TokenUsageAttempt(tokens_used=1000, success=True))

# Total tokens: 3000 (all attempts counted)
# Tokens wasted: 2000 (failed attempts)
# Tokens from retries: 2000 (attempts 2+3)
```

### Per-Request vs Aggregate Tokens

```python
# Per-request (in PredictionCategoryTokens)
tokens_used: Dict  # Tokens for this successful attempt

# Aggregate (tracked across all attempts)
all_attempts: List[TokenUsageAttempt]  # All attempts (including failures)
total_tokens_all_attempts: Dict  # Sum of all attempts
```

### Retry Strategy

```python
# Exponential backoff
attempt = 0: wait 0s
attempt = 1: wait 20s
attempt = 2: wait 40s
# After 3 attempts, give up
```

**Why exponential backoff?**
- Transient errors (network hiccups) resolve quickly
- Persistent errors (bad format) won't resolve, so fail fast
- Prevents overwhelming the API with retries

---

## Summary

1. **Semaphore**: Controls concurrency (how many at once)
2. **Rate Limiter**: Controls rate (how many per minute)
3. **Registry**: Ensures rate limiters are shared globally
4. **Aggregate Logging**: Reduces log noise while maintaining visibility
5. **Token Tracking**: Accounts for all tokens, including failed attempts

Together, these mechanisms enable efficient, compliant, and observable LLM experimentation at scale.
