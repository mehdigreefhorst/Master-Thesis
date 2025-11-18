# Validation Patterns - Quick Reference

## Current Patterns at a Glance

### Pattern 1: User Verification (25+ occurrences)
```python
# Current (Repetitive)
user_id = get_jwt_identity()
current_user = get_user_repository().find_by_id(user_id)
if not current_user:
    return jsonify(error="No such user"), 401

# Proposed (Single Decorator)
@require_user()
def handler(current_user):
    # Use current_user directly
```

**Files:** All protected routes
**Impact:** Eliminates 25+ duplicate checks
**Difficulty:** Easy

---

### Pattern 2: Entity Existence (40+ occurrences)
```python
# Current (Inconsistent)
scraper_cluster = get_scraper_cluster_repository().find_by_id_and_user(user_id, cluster_id)
if not scraper_cluster:
    return jsonify(error="Could not find..."), 400  # Sometimes 404, sometimes 409

# Proposed (Standardized)
@require_entity(ScraperCluster, "cluster_id", user_required=True)
def handler(scraper_cluster):
    # Entity guaranteed to exist and belong to user
```

**Files:** clustering_routes.py, experiment_routes.py, scraper_routes.py, etc.
**Impact:** Standardizes error codes, eliminates manual ownership checks
**Difficulty:** Medium

---

### Pattern 3: Status Validation (20+ occurrences)
```python
# Current (Scattered)
if not scraper_cluster.scraper_entity_id:
    return jsonify(message="scraper not initialized"), 409
if scraper_cluster.stages.scraping != StatusType.Completed:
    return jsonify(message="scraper not completed"), 409

# Proposed (Centralized)
@require_status(ScraperCluster, "scraper_entity_id", required=True)
@require_status(ScraperCluster, "stages.scraping", StatusType.Completed)
def handler(scraper_cluster):
    # Status guaranteed to be correct
```

**Files:** clustering_routes.py, experiment_routes.py, scraper_routes.py
**Impact:** Centralizes state validation, enables state machine enforcement
**Difficulty:** Hard

---

### Pattern 4: Error Response (30+ inconsistencies)
```python
# Current Formats (5 variations)
return jsonify(error="message"), 401
return jsonify(error="message"), 404
return jsonify(message="message"), 409
return jsonify(f"message")  # No status specified
return jsonify(message="message"), 200  # Wrong status code

# Proposed (Standardized)
return error_response(ErrorCode.USER_NOT_FOUND, 401)
return error_response(ErrorCode.ENTITY_NOT_FOUND, 404, "ScraperCluster", cluster_id)
return error_response(ErrorCode.INVALID_STATE, 409, "Scraper must be initialized")
```

**Files:** All routes
**Impact:** Consistent error handling, easier client implementation
**Difficulty:** Easy-Medium

---

## Entity Validation Checklist

### Per Entity Type

#### ScraperCluster (20+ validations)
- [ ] User ownership via `find_by_id_and_user()`
- [ ] Entity exists
- [ ] Scraper entity initialized (check scraper_entity_id)
- [ ] Scraping completed (check stages.scraping)
- [ ] Cluster prep completed (check stages.cluster_prep)
- [ ] Can't update if already processing (check stages.scraping)

#### Scraper (5+ validations)
- [ ] User ownership via `find_by_id_and_user()`
- [ ] Entity exists
- [ ] Not already created (for creation)
- [ ] Related cluster exists

#### Sample (3+ validations)
- [ ] Entity exists
- [ ] Belongs to accessed scraper_cluster
- [ ] Has cluster units assigned (for experiments)

#### Experiment (1-2 validations)
- [ ] Entity exists
- [ ] Not already completed

#### ClusterUnit (5+ validations)
- [ ] Entity exists
- [ ] Belongs to accessed scraper_cluster
- [ ] (Sometimes) has ground truth labels

#### Prompt (3+ validations)
- [ ] Entity exists
- [ ] Is public OR created by user
- [ ] Is correct category (Classify_cluster_units)

---

## Error Code Standardization

### Proposed Error Response Format

```python
{
    "error": {
        "code": "ENTITY_NOT_FOUND",  # Programmatic
        "message": "ScraperCluster not found",  # User-readable
        "details": {                # Optional context
            "entity_type": "ScraperCluster",
            "entity_id": "507f1f77bcf86cd799439011"
        }
    }
}
```

### HTTP Status Code Mapping

| Situation | HTTP Code | Error Code |
|-----------|-----------|-----------|
| User JWT missing/invalid | 401 | UNAUTHORIZED |
| User not found | 401 | USER_NOT_FOUND |
| Entity not found | 404 | ENTITY_NOT_FOUND |
| User lacks ownership | 403 | FORBIDDEN |
| Invalid state for operation | 409 | INVALID_STATE |
| Missing required conditions | 400 | BAD_REQUEST |
| Invalid input data | 400 | VALIDATION_ERROR |

---

## Validation Order (Recommended)

1. **Authentication** - User JWT valid
2. **User Exists** - User in database
3. **Entity Exists** - Resource exists
4. **User Ownership** - User owns entity
5. **Entity State** - Entity in correct state
6. **Related Entities** - Dependencies exist
7. **Business Logic** - Actual validation
8. **Action** - Perform the operation

### Example

```python
@scraper_cluster_bp.route("/prepare", methods=["POST"])
@validate_request_body(ScraperClusterId)  # 0. Validate structure
@require_user()  # 1. Extract + verify user (replaces 25+ manual checks)
@require_entity(ScraperCluster, "scraper_cluster_id", user_required=True)  # 2-4. Get + validate entity
@require_status(ScraperCluster, "scraper_entity_id", required=True)  # 5. Check dependencies
@require_status(ScraperCluster, "stages.scraping", StatusType.Completed)  # 6. Check state
def prepare_cluster(current_user, scraper_cluster, body):
    # At this point, all validations passed
    # Proceed with business logic directly
```

---

## Ownership Validation Issues

### Current Issues
- ScraperCluster: Validated via `find_by_id_and_user()` ✓
- Scraper: Validated via `find_by_id_and_user()` ✓
- Sample: NOT validated for ownership ✗ (can access any sample)
- ClusterUnit: NOT validated for ownership ✗ (can access any unit)
- Prompt: Partial validation (checks public OR created_by_user) ~
- Experiment: NOT validated for ownership ✗

### Security Impact
- HIGH: ClusterUnit access (user can read any unit)
- HIGH: Sample access (user can read any sample)
- MEDIUM: Prompt access (public prompts are intentional)
- MEDIUM: Experiment access (depends on sample access)

### Required Fixes
1. Add ownership checks for derived entities
2. Add helper methods: `find_by_id_and_cluster(cluster_id, unit_id)`
3. Validate cascade relationships

---

## Decorator Implementation Roadmap

### Phase 1: User & Error Standardization (Easy)
- [ ] Create `@require_user()` decorator
- [ ] Standardize error response format
- [ ] Add error code enum

### Phase 2: Entity Validation (Medium)
- [ ] Create `@require_entity()` decorator
- [ ] Create `@require_entity_list()` for arrays
- [ ] Add ownership validation to derived entities

### Phase 3: Status Validation (Hard)
- [ ] Create `@require_status()` decorator
- [ ] Define valid state transitions
- [ ] Create state machine validator
- [ ] Add transition validation

### Phase 4: Testing & Documentation (Medium)
- [ ] Add unit tests for decorators
- [ ] Add integration tests for validation chains
- [ ] Update API documentation

---

## Lines of Code Impact

### User Verification
- **Current:** 3-4 lines per route × 25 routes = 75-100 lines
- **After Decorator:** 1 decorator per route × 25 routes = 25 lines
- **Reduction:** 65-75 lines saved

### Entity Existence
- **Current:** 3-4 lines per check × 40 checks = 120-160 lines
- **After Helper:** Decorator overhead
- **Reduction:** 80-120 lines saved

### Status Validation
- **Current:** 2-3 lines per check × 20 checks = 40-60 lines
- **After Helper:** Decorator overhead
- **Reduction:** 30-50 lines saved

### Error Responses
- **Current:** Scattered formatting = inconsistency
- **After Standardization:** Consistent format
- **Reduction:** Maintenance burden reduced

### Total Code Reduction
- **Total Duplicated Code:** ~200+ lines
- **After Refactoring:** ~50-75 lines
- **Reduction:** 50-75% less duplication

---

## Testing Strategy

### Unit Tests (Per decorator)
```python
def test_require_user_decorator():
    # Test with missing JWT
    # Test with invalid JWT
    # Test with user not found
    # Test with valid user

def test_require_entity_decorator():
    # Test with missing entity
    # Test with user not owning entity
    # Test with valid entity
```

### Integration Tests (Validation chains)
```python
def test_entity_access_chain():
    # Test full validation sequence
    # User exists -> Entity exists -> User owns entity -> State valid
```

### Security Tests
```python
def test_ownership_validation():
    # User A cannot access User B's entities
    # Cluster unit ownership is validated
    # Sample ownership is validated
```

---

## Related Files to Modify

```
CRITICAL:
- app/routes/clustering_routes.py       (15+ checks)
- app/routes/experiment_routes.py       (20+ checks)
- app/routes/scraper_routes.py          (8+ checks)
- app/routes/scraper_cluster_routes.py  (8+ checks)
- app/utils/api_validation.py           (add decorators)

HIGH:
- app/routes/filter_actions_routes.py   (5+ checks)
- app/utils/types.py                    (add error codes)

MEDIUM:
- app/routes/user_routes.py             (2 checks)
- app/routes/auth_routes.py             (2 checks)

NEW FILES TO CREATE:
- app/utils/validation_decorators.py    (new decorators)
- app/utils/error_handler.py            (error standardization)
- app/utils/state_validator.py          (state transitions)
```

---

## Quick Stats for Decision Making

| Aspect | Current | After Refactoring | Effort |
|--------|---------|------------------|--------|
| Repeated user checks | 25+ | 0-5 | 2 hours |
| Inconsistent error codes | 5 variants | 1 standard | 4 hours |
| Status validation scattered | 20+ places | 5 decorators | 8 hours |
| Entity ownership unchecked | 10+ cases | all checked | 6 hours |
| Total refactoring time | N/A | N/A | 20 hours |
| Code duplication | 200+ lines | 50-75 lines | See above |
| Security issues | 3-4 high | 0 | See above |
| Maintenance burden | High | Low | Ongoing |

