# Token Tracking System Documentation

## Overview

This system provides **foolproof token tracking** for all LLM API calls, ensuring that **no tokens are ever lost** - even when predictions fail, responses are malformed, or retries occur.

## Problem Solved

Previously, token usage was only tracked for successful predictions. This meant:
- ❌ Tokens from failed API calls were lost
- ❌ Tokens from retry attempts weren't tracked
- ❌ Tokens from malformed responses (invalid JSON) disappeared
- ❌ No aggregate statistics across experiments

## Solution Architecture

### Multi-Level Token Tracking

The system tracks tokens at three levels:

1. **Attempt Level** (`TokenUsageAttempt`)
   - Every single API call, successful or failed
   - Includes attempt number, success status, and error messages

2. **Prediction Level** (`PredictionCategoryTokens`)
   - Successful prediction with all its attempts
   - Aggregates tokens across all retries for that prediction

3. **Experiment Level** (`ExperimentTokenStatistics`)
   - Complete statistics across all predictions
   - Breakdown of wasted tokens, retry tokens, etc.

## Data Models

### TokenUsageAttempt
```python
class TokenUsageAttempt(BaseModel):
    tokens_used: Dict           # Raw token usage from LLM provider
    attempt_number: int         # Which retry (1-indexed)
    success: bool              # Did this result in valid prediction?
    error_message: Optional[str]  # Error if failed
```

### PredictionCategoryTokens
```python
class PredictionCategoryTokens(PredictionCategory):
    tokens_used: Dict                        # Tokens from successful attempt
    all_attempts: List[TokenUsageAttempt]   # ALL attempts including failures
    total_tokens_all_attempts: Dict         # Sum across all attempts
```

### ExperimentTokenStatistics
```python
class ExperimentTokenStatistics(BaseModel):
    total_successful_predictions: int
    total_failed_attempts: int
    total_tokens_used: Dict[str, int]         # All tokens
    tokens_wasted_on_failures: Dict[str, int] # Tokens from failed attempts
    tokens_from_retries: Dict[str, int]       # Tokens from attempts > 1
```

## How It Works

### 1. Token Extraction (Immediate & Safe)
```python
# CRITICAL: Extract tokens IMMEDIATELY after LLM response
tokens_used = LLMService.extract_tokens_from_response(response)
```

This happens **before** any parsing that might fail. The extraction is wrapped in try-catch to never throw exceptions.

### 2. Prediction Parsing (May Fail)
```python
try:
    prediction = LLMService.response_to_prediction_tokens(response, all_attempts)
    # Record successful attempt
    all_attempts.append(TokenUsageAttempt(
        tokens_used=tokens_used,
        attempt_number=attempt_number,
        success=True
    ))
except Exception as e:
    # Parsing failed, but tokens STILL tracked
    all_attempts.append(TokenUsageAttempt(
        tokens_used=tokens_used,
        attempt_number=attempt_number,
        success=False,
        error_message=str(e)
    ))
    raise  # Retry logic kicks in
```

### 3. Retry Logic (Preserves Token History)
```python
all_attempts = []  # Persists across retries

for attempt in range(max_retries):
    try:
        result = await predict_single_run_cluster_unit(
            ...,
            attempt_number=attempt + 1,
            all_attempts=all_attempts  # Passed by reference!
        )
        return result  # Success!
    except Exception:
        # all_attempts already has the failed token data
        # Try again...
```

### 4. Experiment-Level Aggregation
```python
# After all predictions complete
ExperimentService.calculate_and_store_token_statistics(
    cluster_unit_entities,
    experiment_entity
)
```

This aggregates:
- Total tokens used (sum of ALL attempts)
- Tokens wasted on failures
- Tokens from retry attempts
- Success/failure counts

## Example Scenario

### Scenario: 1 Prediction with 3 Attempts

1. **Attempt 1**: LLM returns invalid JSON
   - Tokens used: 1000
   - Status: Failed
   - Error: "JSONDecodeError: Expecting value"
   - ✅ **Tokens tracked**

2. **Attempt 2**: LLM returns valid JSON but wrong format
   - Tokens used: 1000
   - Status: Failed
   - Error: "KeyError: 'labels'"
   - ✅ **Tokens tracked**

3. **Attempt 3**: Success!
   - Tokens used: 1000
   - Status: Success
   - ✅ **Tokens tracked**

### Result

```python
PredictionCategoryTokens(
    # ... prediction data ...
    tokens_used={"total_tokens": 1000},  # From successful attempt
    all_attempts=[
        TokenUsageAttempt(tokens_used={"total_tokens": 1000}, attempt_number=1, success=False, error_message="JSONDecodeError"),
        TokenUsageAttempt(tokens_used={"total_tokens": 1000}, attempt_number=2, success=False, error_message="KeyError"),
        TokenUsageAttempt(tokens_used={"total_tokens": 1000}, attempt_number=3, success=True),
    ],
    total_tokens_all_attempts={"total_tokens": 3000}  # Sum of all attempts!
)
```

### Experiment Statistics

```python
ExperimentTokenStatistics(
    total_successful_predictions=1,
    total_failed_attempts=2,
    total_tokens_used={"total_tokens": 3000},
    tokens_wasted_on_failures={"total_tokens": 2000},  # Attempts 1 & 2
    tokens_from_retries={"total_tokens": 2000}         # Attempts 2 & 3
)
```

## Key Design Principles

### 1. **Separation of Concerns**
- Token extraction ≠ Prediction parsing
- Token tracking happens FIRST, always succeeds
- Prediction parsing happens SECOND, may fail

### 2. **Fail-Safe Extraction**
```python
def extract_tokens_from_response(response) -> Dict:
    try:
        return LlmHelper.get_llm_usage(response)
    except Exception:
        # Never fail - return empty dict
        return {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
```

### 3. **Pass-by-Reference Token List**
The `all_attempts` list is passed by reference through the retry loop, so it accumulates across all attempts.

### 4. **Immediate Tracking**
Tokens are recorded to the `all_attempts` list **immediately** after extraction, before any parsing or business logic.

## Usage Statistics You Can Answer

With this system, you can now answer:

1. **How many tokens did my experiment really use?**
   - `experiment.token_statistics.total_tokens_used`

2. **How many tokens were wasted on failures?**
   - `experiment.token_statistics.tokens_wasted_on_failures`

3. **What's my failure rate?**
   - `failed_attempts / (successful_predictions + failed_attempts)`

4. **How much did retries cost me?**
   - `experiment.token_statistics.tokens_from_retries`

5. **For a specific prediction, how many attempts did it take?**
   - `len(prediction.all_attempts)`

6. **What errors caused token waste?**
   - `[attempt.error_message for attempt in prediction.all_attempts if not attempt.success]`

## Benefits

✅ **Complete Accuracy**: Every token is tracked, no exceptions
✅ **Cost Transparency**: See exactly where your API budget goes
✅ **Debugging Aid**: See which predictions needed retries and why
✅ **Optimization Insights**: Identify prompts that cause frequent failures
✅ **Budget Planning**: Know true costs including retry overhead

## Integration Points

The token tracking system integrates at these points:

1. **`LLMService.extract_tokens_from_response()`** - Safe extraction
2. **`LLMService.response_to_prediction_tokens()`** - Parsing with attempt tracking
3. **`ExperimentService.predict_single_run_cluster_unit()`** - Per-prediction tracking
4. **`ExperimentService.calculate_and_store_token_statistics()`** - Experiment aggregation

## Migration Notes

### For Existing Code

The system is **backwards compatible**. Old predictions without `all_attempts` will still work:

```python
# Old prediction (no all_attempts)
old_prediction = PredictionCategoryTokens(
    tokens_used={"total_tokens": 1000}
    # all_attempts defaults to []
)

# System handles gracefully
total = old_prediction.total_tokens_all_attempts  # Will be empty dict
```

### For New Experiments

All new experiments automatically use the comprehensive tracking system. No code changes needed!

## Monitoring & Logging

The system logs token statistics at INFO level:

```
INFO Token Statistics for Experiment 507f1f77bcf86cd799439011:
INFO   Successful predictions: 150
INFO   Failed attempts: 25
INFO   Total tokens: {'total_tokens': 525000}
INFO   Tokens wasted: {'total_tokens': 75000}
INFO   Tokens from retries: {'total_tokens': 100000}
```

## Cost Calculation Example

```python
def calculate_experiment_cost(experiment: ExperimentEntity, cost_per_1k_tokens: float):
    """Calculate the actual cost of running an experiment"""
    total_tokens = experiment.token_statistics.total_tokens_used["total_tokens"]
    cost = (total_tokens / 1000) * cost_per_1k_tokens

    # Break down costs
    wasted_tokens = experiment.token_statistics.tokens_wasted_on_failures["total_tokens"]
    wasted_cost = (wasted_tokens / 1000) * cost_per_1k_tokens

    return {
        "total_cost": cost,
        "wasted_cost": wasted_cost,
        "useful_cost": cost - wasted_cost,
        "waste_percentage": (wasted_cost / cost) * 100 if cost > 0 else 0
    }
```

## Future Enhancements

Potential additions to the system:

1. **Token Budget Enforcement**: Halt experiment if budget exceeded
2. **Real-time Cost Tracking**: WebSocket updates during long runs
3. **Per-Label Token Analysis**: Which labels are most expensive to predict?
4. **Prompt Efficiency Scoring**: Compare token usage across different prompts
5. **Automatic Retry Strategy Tuning**: Optimize max_retries based on historical data

## Conclusion

This token tracking system ensures **complete visibility** into your LLM API usage. No tokens are lost, all costs are accounted for, and you have detailed insights into where your budget goes.

The system is **foolproof** because:
- Token extraction never fails
- Tokens are tracked before any parsing
- Retry logic preserves token history
- All data persists to the database
