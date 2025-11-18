# Flask Routes Validation Patterns - Executive Summary

## Quick Overview

Your codebase has **HIGH DUPLICATION** in validation logic with **INCONSISTENT** error responses. Validation patterns are scattered across 25+ manual checks spread throughout 8 route files.

---

## Key Findings

### 1. MOST REPEATED PATTERN: User Verification (25+ occurrences)

This pattern appears in almost every protected route:

```python
# ❌ CURRENT: Repeated in every route
@route(...)
@jwt_required()
def handler():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    # ... rest of route

# Examples:
# - scraper_cluster_routes.py:20-24
# - clustering_routes.py:26-30
# - experiment_routes.py:27-31
# - ... 20+ more times
```

**Status:** CRITICAL - Should be a single decorator

---

### 2. ENTITY EXISTENCE VALIDATION (40+ occurrences)

Different entity types checked inconsistently:

```python
# ❌ CURRENT: Repeated per entity, inconsistent status codes

# Scraper cluster - 20+ times
scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, cluster_id)
if not scraper_cluster_entity:
    return jsonify(error=f"Could not find scraper_cluster_id {cluster_id}"), 400  # Some use 400
    # return jsonify(error=f"Scraper cluster not found"), 404  # Some use 404
    # return jsonify(message="scraper not found"), 409  # Some use 409

# Scraper entity - 5+ times
scraper = get_scraper_repository().find_by_id_and_user(user_id, scraper_id)
if not scraper:
    return jsonify(error=f"Scraper {scraper_id} not found"), 400

# Sample entity - 3+ times (inconsistent)
sample = get_sample_repository().find_by_id(sample_id)
if not sample:
    return jsonify(message="sample not found"), 400

# Cluster units - 5+ times
unit = get_cluster_unit_repository().find_by_id(unit_id)
if not unit:
    return jsonify(error="No cluster unit found"), 400

# Prompts - 3+ times
prompt = get_prompt_repository().find_by_id(prompt_id)
if not prompt:
    return jsonify(message="prompt not found"), 400

# Similar patterns for experiments, samples, etc.
```

**Issues:**
- Different status codes for same problem (400 vs 404 vs 409)
- Mixed "error" vs "message" keys
- No ownership validation for derived entities (cluster units, samples)
- Manual duplication of same checks

---

### 3. STATUS/STATE VALIDATION (20+ occurrences)

Inconsistent order and messaging:

```python
# ❌ CURRENT: Repeated checks, inconsistent

# Check 1: Scraper initialized (3+ places)
if not scraper_cluster_entity.scraper_entity_id:
    return jsonify(message="scraper not initialized"), 409

# Check 2: Scraping completed (8+ places)
if scraper_cluster_entity.stages.scraping != StatusType.Completed:
    return jsonify(message="scraper not completed yet"), 409

# Check 3: Cluster prep completed (5+ places)
if scraper_cluster_entity.stages.cluster_prep != StatusType.Completed:
    return jsonify(message="Cluster prep not completed"), 409

# Check 4: Already completed (blocks update)
if scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
    return jsonify(message="Cluster prep already done"), 409

# Similar checks scattered throughout all routes
```

**Issues:**
- Order of checks varies between routes
- No validation of state transitions
- Sometimes checks are missing in some routes but present in others
- No centralized state machine definition

---

### 4. ERROR RESPONSE INCONSISTENCY

Five different response formats across routes:

```python
# Format 1: error field (400)
return jsonify(error="No such user"), 401

# Format 2: error field (404)
return jsonify(error=f"Could not find scraper_cluster_id {id}"), 404

# Format 3: message field (409)
return jsonify(message="scraper is not yet initialized"), 409

# Format 4: message field with context
return jsonify(message="The scraper is not yet done"), 200  # Wrong status!

# Format 5: string directly  
return jsonify(f"Scraper cluster entity: {id} not findable")  # Inconsistent

# No standardized format - client must parse differently for each!
```

**Issues:**
- Mixes "error" and "message" keys
- Inconsistent HTTP status codes
- Sometimes strings instead of dicts
- No structured error codes

---

## Working Well (Don't Change)

### Request/Query Validation ✓
```python
@validate_request_body(CreateScraperClusterRequest)  # Good decorator
@validate_query_params(GetClusterUnitsRequest)       # Good decorator
```
These decorators handle structural validation well. Keep this pattern.

### Repository Layer ✓
```python
find_by_id_and_user(user_id, entity_id)  # Good - validates ownership at DB level
find_by_user_id(user_id)                  # Good - list user's entities
```
Repository pattern is solid. Add more helper methods, don't change existing.

---

## Severity Breakdown

| Pattern | Occurrences | Severity | Impact |
|---------|-------------|----------|--------|
| User verification repeat | 25+ | CRITICAL | Duplicate code in every route |
| Entity existence checks | 40+ | CRITICAL | Inconsistent error codes/messages |
| Status validation | 20+ | HIGH | No state machine, inconsistent |
| Missing ownership checks | 10+ | HIGH | Potential security issue |
| Error response format | 30+ | HIGH | Client confusion, hard to handle |
| State transition validation | 20+ | MEDIUM | No validation of legal transitions |
| Array validation | 5+ | MEDIUM | No bounds/element checking |

---

## Concrete Examples of Problems

### Problem 1: Same check, three different responses

```python
# scraper_cluster_routes.py:40-43
if not scraper_cluster:
    return jsonify(error=f"Scraper cluster {id} not found"), 404

# clustering_routes.py:34-35
if not scraper_cluster_entity:
    return jsonify(error=f"Could not find scraper_cluster_instance for id {id}"), 400

# experiment_routes.py:35-36
if not scraper_cluster_entity:
    return jsonify(error=f"Could not find associated scraper_cluster_instance for id {id}"), 400

# Client code has to handle:
# - Different messages
# - Different status codes (400 vs 404)
# - Different error structures
```

### Problem 2: Status checks in wrong order

```python
# experiment_routes.py - Good order
if not scraper_cluster_entity:
    return jsonify(error="..."), 400
if not scraper_cluster_entity.scraper_entity_id:
    return jsonify(message="scraper not initialized"), 409
if scraper_cluster_entity.stages.scraping != StatusType.Completed:
    return jsonify(message="scraper not completed"), 409

# clustering_routes.py - Different order
if not scraper_cluster_entity:
    return jsonify(error="..."), 400
if not scraper_cluster_entity.scraper_entity_id:
    return jsonify(message="scraper not initialized"), 409
if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
    return jsonify(message="scraper not completed"), 409
if scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:  # Only here!
    return jsonify(message="already done"), 409

# Different routes check different conditions!
```

### Problem 3: Missing ownership validation

```python
# In filter_actions_routes.py:45-50
for unit_id in body.cluster_unit_ids:
    unit = get_cluster_unit_repository().find_by_id(unit_id)  # No ownership check!
    if unit and unit.cluster_entity_id == scraper_cluster_entity.id:  # Check added ad-hoc
        cluster_units.append(unit)

# But in experiment_routes.py:118-121
cluster_unit_entities = get_cluster_unit_repository().find_many_by_ids(sample_entity.sample_cluster_unit_ids)
if not cluster_unit_entities or not len(cluster_unit_entities) == len(sample_entity.sample_cluster_unit_ids):
    # No ownership validation at all!
```

---

## Recommended Solution Structure

### High Priority (Do First)

1. **Validation Decorator for User** (~2-3 routes simplified from 25+)
2. **Error Response Standardization** (~consistent format across 30+ responses)
3. **Status Validation Helper** (~centralize 20+ status checks)

### Medium Priority (Do After)

4. **Entity Requirement Decorator** (~5-10 lines per entity type)
5. **Ownership Validation Helper** (~function, not manual checks)

### Implementation Order

```
Week 1: Standardize errors + user decorator
Week 2: Status validation helper + decorators
Week 3: Entity decorators + test refactoring
Week 4: Ownership validation + security audit
```

---

## Code Metrics

- **Total Routes:** 30+
- **User checks:** 25+ (can reduce to 0-5 with decorator)
- **Entity existence checks:** 40+ (can reduce to 5-10 with helpers)
- **Status checks:** 20+ (can reduce to 5-10 with centralized validator)
- **Error response variations:** 5 different formats
- **Inconsistent status codes:** 4 different codes for same issue type (400, 401, 404, 409)

**Lines of duplicated validation code:** ~200+ lines (can reduce to ~50)

---

## Files Requiring Changes

**High Impact:** 
- `app/routes/clustering_routes.py` - 15+ validation checks
- `app/routes/experiment_routes.py` - 20+ validation checks
- `app/routes/scraper_routes.py` - 8+ validation checks
- `app/routes/scraper_cluster_routes.py` - 8+ validation checks

**Medium Impact:**
- `app/routes/filter_actions_routes.py` - 5+ validation checks
- `app/utils/api_validation.py` - Add new decorators

**Low Impact:**
- `app/routes/user_routes.py` - 2 validation checks
- `app/routes/auth_routes.py` - 2 validation checks

---

## Next Steps

1. Read the detailed analysis in the full document
2. Decide on standardized error response format
3. Create validation decorators starting with `@require_user()`
4. Refactor routes one file at a time
5. Add integration tests for validation scenarios

