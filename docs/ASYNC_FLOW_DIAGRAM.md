# Async Flow Diagram: Visual Reference

## Complete Request Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     USER STARTS EXPERIMENT                              │
│                  250 cluster units × 3 runs = 750 tasks                 │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    TASK CREATION (create_predicted_categories)          │
│                                                                         │
│  semaphore = asyncio.Semaphore(1000)                                   │
│  tasks = [predict_single_with_semaphore_and_retry(...) for ...]       │
│  results = await asyncio.gather(*tasks)                                │
│                                                                         │
│  Status: 750 tasks created, all start "immediately"                    │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             LAYER 1: SEMAPHORE (Concurrency Control)                    │
│                                                                         │
│  async with semaphore:  # Max 1000 concurrent                          │
│      ┌─────────┐  ┌─────────┐  ┌─────────┐       ┌─────────┐         │
│      │ Task 1  │  │ Task 2  │  │  ...    │  ...  │Task 1000│         │
│      └─────────┘  └─────────┘  └─────────┘       └─────────┘         │
│           │            │            │                  │               │
│           └────────────┴────────────┴──────────────────┘               │
│                              │                                          │
│  ┌──────────────────────────────────────────────────┐                  │
│  │ Waiting Queue: Tasks 1001-1500 (if > 1000)      │                  │
│  └──────────────────────────────────────────────────┘                  │
│                                                                         │
│  Controls: Max simultaneous connections                                │
│  Scope: Per experiment                                                 │
│  Why: Prevents overwhelming local system resources                     │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│           LAYER 2: RATE LIMITER (API Compliance)                        │
│                                                                         │
│  rate_limiter = RateLimiterRegistry.get_limiter(api_key)               │
│  await rate_limiter.acquire()                                          │
│                                                                         │
│  Sliding Window (60 requests/minute):                                  │
│  ┌────────────────────────────────────────────────────────┐            │
│  │ Time: t=0 ────────────────────────────────────► t=60   │            │
│  │ Queue: [x x x x x x x x x x ... x x x x x x x x x x]   │            │
│  │ Count: 60/60 requests ■■■■■■■■■■■■■■■■■■■■ (FULL)     │            │
│  └────────────────────────────────────────────────────────┘            │
│                                                                         │
│  If queue full → wait for oldest to expire                             │
│  Example: At t=60, wait 1s for t=0 to expire                           │
│                                                                         │
│  Controls: Requests per time period                                    │
│  Scope: Global (per API key)                                           │
│  Why: Prevents 429 rate limit errors from API                          │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: RETRY WRAPPER                               │
│                                                                         │
│  for attempt in range(max_retries):                                    │
│      try:                                                               │
│          result = await predict_single_run_cluster_unit()              │
│          return result  ✓                                               │
│      except Exception:                                                  │
│          wait = 20 * attempt  # 0s, 20s, 40s                           │
│          await asyncio.sleep(wait)                                     │
│                                                                         │
│  Controls: Transient error handling                                    │
│  Why: Network hiccups, temporary API issues                            │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   LAYER 4: LLM API CALL                                 │
│                                                                         │
│  response = await llm.chat.completions.create(                         │
│      model=model,                                                       │
│      messages=messages,                                                 │
│      reasoning_effort=reasoning_effort                                  │
│  )                                                                      │
│                                                                         │
│  ┌─────────────────────────────────────────────────────┐               │
│  │ OpenRouter API                                      │               │
│  │ ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐    │               │
│  │ │GPT-4o  │  │Claude  │  │Llama   │  │Other   │    │               │
│  │ └────────┘  └────────┘  └────────┘  └────────┘    │               │
│  └─────────────────────────────────────────────────────┘               │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│              LAYER 5: RESPONSE PROCESSING                               │
│                                                                         │
│  Step 1: Extract tokens (NEVER FAILS)                                  │
│  ┌────────────────────────────────────────────────────┐                │
│  │ tokens = response.usage.to_dict()                  │                │
│  │ all_attempts.append(TokenUsageAttempt(...))        │                │
│  └────────────────────────────────────────────────────┘                │
│                           │                                             │
│  Step 2: Parse response (MAY FAIL → retry)           │                │
│  ┌────────────────────────────────────────────────────┐                │
│  │ prediction = json.loads(response.choices[0]...)    │                │
│  │ return PredictionCategoryTokens(...)               │                │
│  └────────────────────────────────────────────────────┘                │
│                                                                         │
│  If parsing fails: Exception → retry in Layer 3                        │
│  Tokens already saved in all_attempts → never lost                     │
└─────────────────────────────┬───────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        SUCCESS / FAILURE                                │
│                                                                         │
│  ✓ Success: Return PredictionCategoryTokens with all token data        │
│  ✗ Failure: Return None after max_retries (tokens still tracked)       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Comparison: Semaphore vs Rate Limiter

### Semaphore (Concurrency Control)

```
TIME →

t=0s:   [Task1][Task2][Task3]...[Task1000]  ← 1000 active
        [Task1001][Task1002]...[Task1500]   ← 500 waiting

t=1s:   [Task1][Task2][Task3]...[Task1000]  ← Still 1000 active
        [Task1001][Task1002]...[Task1500]   ← Still 500 waiting
        ↑ Some tasks finish → waiting tasks take their place

Purpose: Limit simultaneous execution
Mechanism: Counter (1000 active, others wait)
```

### Rate Limiter (Request Rate Control)

```
REQUESTS/MINUTE →

Window: |─────────────────────────── 60 seconds ──────────────────────────|
        t=0                                                              t=60

Minute 1: [x][x][x][x][x][x]...[x]  ← 60 requests, ~1 per second
          1  2  3  4  5  6    ... 60

Minute 2: [x][x][x][x][x][x]...[x]  ← Another 60 requests, ~1 per second
          61 62 63 64 65 66   ... 120

Purpose: Limit requests per time period
Mechanism: Sliding window of timestamps
```

---

## Example Timeline: 750 Requests

```
Time   | Semaphore          | Rate Limiter       | Active | Completed | Remaining
─────────────────────────────────────────────────────────────────────────────────
t=0s   | 750 tasks start    | Allows 1/sec       | 1      | 0         | 750
t=1s   | 750 active         | Allows 1/sec       | 1      | 1         | 749
t=10s  | 750 active         | Allows 1/sec       | 1      | 10        | 740
t=60s  | 750 active         | Queue full (60/60) | 1      | 60        | 690
t=120s | 750 active         | Queue full (60/60) | 1      | 120       | 630
t=300s | 750 active         | Queue full (60/60) | 1      | 300       | 450
t=750s | All complete       | Queue empty        | 0      | 750       | 0
```

**Key Insights:**
- Semaphore doesn't limit speed (all 750 could run immediately)
- Rate limiter is the bottleneck (1 per second = 750 seconds total)
- In practice: ~12.5 minutes for 750 requests at 60/minute

---

## Logging Evolution

### Before (Noisy)

```
2025-11-26 14:23:10 INFO [app.utils.llm_helper] Rate limited for 0.95s
2025-11-26 14:23:11 INFO [app.utils.llm_helper] Rate limited for 0.87s
2025-11-26 14:23:12 INFO [app.utils.llm_helper] Rate limited for 0.92s
2025-11-26 14:23:13 INFO [app.utils.llm_helper] Rate limited for 0.88s
2025-11-26 14:23:14 INFO [app.utils.llm_helper] Rate limited for 0.91s
... (750 log messages)
```

**Problem:** Hundreds of nearly identical log messages

### After (Aggregate)

```
2025-11-26 14:23:10 INFO [app.utils.rate_limiters]
  Rate limiter summary (last 10.0s): 60 requests, 48 throttled (80.0%), queue: 60/60

2025-11-26 14:23:20 INFO [app.utils.rate_limiters]
  Rate limiter summary (last 10.0s): 60 requests, 52 throttled (86.7%), queue: 60/60

2025-11-26 14:23:30 INFO [app.utils.rate_limiters]
  Rate limiter summary (last 10.0s): 60 requests, 50 throttled (83.3%), queue: 60/60
```

**Benefits:**
- Reduced from ~750 logs to ~75 logs (10× reduction)
- Still shows rate limiting is happening
- Includes useful metrics (throttle rate, queue size)

---

## Common Scenarios

### Scenario 1: Free Tier (60 requests/min)

```
Configuration:
  requests_per_minute: 60
  max_concurrent: 1000

Expected behavior:
  - All 750 tasks start immediately
  - Rate limiter spaces them to ~1 per second
  - Total time: ~12.5 minutes

Throttle rate: 80-90% (most requests wait)
```

### Scenario 2: Pro Tier (300 requests/min)

```
Configuration:
  requests_per_minute: 300
  max_concurrent: 1000

Expected behavior:
  - All 750 tasks start immediately
  - Rate limiter spaces them to ~5 per second
  - Total time: ~2.5 minutes

Throttle rate: 30-50% (some requests wait)
```

### Scenario 3: Enterprise (1000 requests/min)

```
Configuration:
  requests_per_minute: 1000
  max_concurrent: 1000

Expected behavior:
  - All 750 tasks start immediately
  - Rate limiter rarely activates
  - Total time: ~45 seconds

Throttle rate: <10% (few requests wait)
```

---

## Debug Checklist

When requests are slow, check:

1. **Rate Limiter Metrics**
   ```python
   metrics = RateLimiterRegistry.get_metrics()
   print(f"Throttle rate: {metrics['throttle_rate']:.1%}")
   print(f"Avg wait time: {metrics['avg_wait_time']:.2f}s")
   ```

2. **Semaphore Capacity**
   ```python
   # In experiment_service.py:35
   max_concurrent: int = 1000  # Check this value
   ```

3. **API Rate Limits**
   ```python
   # In llm_helper.py:71
   requests_per_minute: Optional[int] = 60  # Match your plan
   ```

4. **Log Output**
   ```
   Look for: "Rate limiter summary"
   High throttle rate → rate limiter is bottleneck
   Low throttle rate → something else is slow
   ```

5. **429 Errors**
   ```python
   # If you see these, your rate limit is too high
   # Lower requests_per_minute
   ```

---

## Quick Reference

| Component | File | Line | Purpose |
|-----------|------|------|---------|
| Semaphore | `experiment_service.py` | 78 | Concurrency control |
| Rate Limiter | `rate_limiters.py` | 60 | API compliance |
| Registry | `rate_limiters.py` | 25 | Share rate limiters |
| Retry Logic | `experiment_service.py` | 89 | Handle failures |
| Token Tracking | `llm_service.py` | 38 | Never lose tokens |
| Aggregate Logging | `rate_limiters.py` | 145 | Reduce log noise |

---

## Summary

**Two controls, two purposes:**
- **Semaphore**: "Don't run too many at once" (local limit)
- **Rate Limiter**: "Don't run too many per minute" (API limit)

**Together they enable:**
- Efficient concurrency (semaphore prevents waste)
- API compliance (rate limiter prevents 429 errors)
- Observable execution (aggregate logging shows progress)
- Accurate token accounting (track all attempts, including failures)
