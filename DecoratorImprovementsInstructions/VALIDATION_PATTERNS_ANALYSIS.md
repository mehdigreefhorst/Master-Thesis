# Flask Routes Validation Patterns Analysis

## Overview
This analysis examines the current validation patterns used across 8 Flask route files in the application. The routes handle scraping, clustering, experiments, filtering, user management, and authentication.

---

## 1. CURRENT VALIDATION PATTERNS

### 1.1 User Authentication & Authorization

**Pattern Used: Manual JWT extraction + User lookup**

All protected routes follow this pattern:
```python
@route(...)
@jwt_required()
def route_handler():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
```

**Files:** scraper_cluster_routes.py, clustering_routes.py, experiment_routes.py, user_routes.py, scraper_routes.py, filter_actions_routes.py

**Issues:**
- Repeated in EVERY protected route (8+ occurrences)
- No centralized validation decorator
- No consistent error message formatting
- Duplicated code makes maintenance harder

**Examples:**
- scraper_cluster_routes.py:20-24 (get_scraper_cluster_instances)
- clustering_routes.py:26-30 (prepare_cluster)
- experiment_routes.py:27-31 (get_experiment_instances)

---

### 1.2 Entity Existence Validation

**Pattern Used: Manual find() + null check + custom error messages**

Example from scraper_cluster_routes.py:
```python
scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, scraper_cluster_id)
if not scraper_cluster_entity:
    return jsonify(error=f"Could not find associated scraper_cluster_instance for id= {scraper_cluster_id}"), 400
```

**Validation Types:**
1. **Scraper Cluster Existence** - Most common (20+ occurrences)
   - clustering_routes.py:32-35 (prepare_cluster)
   - experiment_routes.py:33-36 (get_experiment_instances)
   - scraper_routes.py:55-58 (create_scraper_entity)

2. **Scraper Entity Existence** - Medium frequency (5+ occurrences)
   - scraper_routes.py:35-37 (get_scraper_entity)
   - clustering_routes.py:46-48 (prepare_cluster)

3. **Sample Entity Existence** - Low frequency (3+ occurrences)
   - experiment_routes.py:96-99 (create_experiment)
   - experiment_routes.py:305-308 (get_sample_units)

4. **Experiment Entity Existence** - Rare (1-2 occurrences)
   - experiment_routes.py:144-147 (continue_experiment)

5. **Cluster Unit Existence** - Medium frequency (5+ occurrences)
   - experiment_routes.py:185-188 (parse_prompt)
   - filter_actions_routes.py:45-50 (extract_standalone_statements)

6. **Prompt Entity Existence** - Medium frequency (3+ occurrences)
   - experiment_routes.py:85-88 (create_experiment)
   - experiment_routes.py:174-177 (parse_prompt)

**Issues:**
- Repeated null checks for same entity types
- Inconsistent error messages/status codes
- Different status codes for same issue (400, 401, 404, 409)
- No standardized error response format

---

### 1.3 Status/State Validation

**Pattern Used: Manual stage property checks**

Example from clustering_routes.py:
```python
if not scraper_cluster_entity.scraper_entity_id:
    return jsonify(message="scraper is not yet initialized"), 409

if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
    return jsonify(message="scraper is not completed yet"), 409

if scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
    return jsonify(message="Cluster preparation is already completed"), 409
```

**Status Checks Found:**
1. **Scraper Entity Initialized** (3+ occurrences)
   - clustering_routes.py:37-38, 82-83, 110-111
   - scraper_routes.py:88-89, 118-119

2. **Scraping Completion** (8+ occurrences)
   - clustering_routes.py:40-41, 84-85, 113-114
   - experiment_routes.py:41-42, 79-80, 296-297

3. **Cluster Prep Completion** (5+ occurrences)
   - clustering_routes.py:43-44, 87-88, 116-117
   - experiment_routes.py:299-300

4. **Sample Entity Existence** (3+ occurrences)
   - experiment_routes.py:82-83, 302-303

5. **Update Prevention (Initialized check)** (1 occurrence)
   - scraper_cluster_routes.py:74-75 (update_scraper_cluster)

**Issues:**
- Mixed use of "Completed", "Ongoing", "Initialized", "Paused" states
- Inconsistent order of checks
- Some checks use 409 Conflict, others 400 Bad Request
- No validation of valid state transitions

---

### 1.4 User Ownership Verification

**Pattern Used: find_by_id_and_user() repository method**

Example from scraper_cluster_routes.py:
```python
scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(user_id, scraper_cluster_id)
```

Repository implementation (scraper_cluster_repository.py:16-19):
```python
def find_by_id_and_user(self, user_id: PyObjectId, scraper_cluster_entity_id: PyObjectId) -> ScraperClusterEntity | None:
    filter = {"user_id": user_id, "_id": scraper_cluster_entity_id}
    return super().find_one(filter)
```

**Used for:**
- Scraper Cluster ownership (20+ times)
- Scraper ownership (5+ times)

**Issues:**
- Works well at DB layer but no route-level abstraction
- Not all related entity lookups validate ownership
- Manual ownership checks missing for derived entities

---

### 1.5 Request Body Validation

**Pattern Used: Pydantic decorator + ValidationError handling**

```python
@scraper_cluster_bp.route("/", methods=["POST"])
@validate_request_body(CreateScraperClusterRequest)
@jwt_required()
def create_scraper_cluster(body: CreateScraperClusterRequest):
```

Implementation (app/utils/api_validation.py:14-34):
```python
def validate_request_body(model: Type[T]) -> Callable:
    def decorator(func: Callable) -> Callable:
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                validated_body = model(**request.get_json())
                kwargs["body"] = validated_body
            except ValidationError as e:
                return jsonify({"error": "Invalid request", "details": e.errors()}), 400
            return func(*args, **kwargs)
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator
```

**Files Using:**
- scraper_cluster_routes.py:48, 65
- clustering_routes.py:24, 69, 96, 129, 148
- experiment_routes.py:63, 167, 196, 217, 249, 280, 323, 354
- filter_actions_routes.py:24, 96
- scraper_routes.py:47, 75, 105, 145
- user_routes.py:26
- auth_routes.py:24, 37

**Strengths:**
- Centralized validation logic
- Consistent error format
- Type-safe through Pydantic models

**Gaps:**
- Only validates request body/query structure
- Doesn't validate business logic (entity relationships, state consistency)

---

### 1.6 Query Parameter Validation

**Pattern Used: Pydantic decorator + type preprocessing**

```python
@clustering_bp.route("/get_cluster_units", methods=["GET"])
@validate_query_params(GetClusterUnitsRequest)
@jwt_required()
def get_cluster_units(query: GetClusterUnitsRequest):
```

Implementation handles:
- List parsing (comma-separated, repeated values)
- Boolean conversion
- Type coercion

**Files Using:**
- clustering_routes.py:96, 148
- experiment_routes.py:25, 137, 280, 323, 354
- scraper_routes.py:21, 145
- filter_actions_routes.py (none - uses request body instead)

---

## 2. ERROR RESPONSE FORMATS

**Inconsistent across routes:**

1. **401 User Not Found:**
   - `jsonify(error="No such user")`
   - Used in: scraper_cluster_routes.py:24, clustering_routes.py:30, etc.

2. **400 Entity Not Found:**
   - `jsonify(error="Could not find associated scraper_cluster_instance for id= {id}")`
   - `jsonify(error=f"No scraper entity connected to scraper_cluster_entity = {id}")`
   - Used in: clustering_routes.py:35, scraper_routes.py:58, etc.

3. **404 Entity Not Found:**
   - `jsonify(error=f"Scraper cluster with id {id} not found")`
   - Used in: scraper_cluster_routes.py:43

4. **409 Conflict (State Issue):**
   - `jsonify(message="scraper is not yet initialized")`
   - `jsonify(message="scraper is not completed yet")`
   - Used in: clustering_routes.py:38, scraper_routes.py:61, etc.

**Issues:**
- Mixes "error" and "message" keys
- Inconsistent status codes for same issue type
- Some responses use 409, others use 400 for state conflicts
- No standardized error response structure

---

## 3. REPOSITORY PATTERN SUMMARY

**Three-tier approach:**
1. **BaseRepository** - Generic CRUD (base_repository.py)
2. **Specific Repositories** - Entity-specific methods
   - `find_by_id_and_user()` - User ownership validation
   - `find_by_user_id()` - List by user
   - `find()`, `find_one()`, `update()` - Generic operations

3. **Routes** - Call repository methods, handle business logic

**Repository Features:**
- Soft deletes (deleted_at field)
- Auto timestamp updates (updated_at)
- Pydantic entity conversion
- MongoDB integration

**Gaps:**
- No business logic validation in repositories
- Status transition validation not implemented
- No transaction support
- No relationship validation

---

## 4. COMMON VALIDATION SEQUENCES

### Sequence 1: Standard Entity Access (Most Common)
```python
1. Extract user_id via JWT
2. Verify user exists (get_user_repository().find_by_id())
3. Get entity by ID + user (find_by_id_and_user())
4. Check entity null
5. Validate entity state/status
6. Perform action
```

**Occurrences:** 20+ across clustering, experiment, scraper routes

### Sequence 2: Nested Entity Access
```python
1. Extract user_id via JWT
2. Verify user exists
3. Get parent entity (find_by_id_and_user())
4. Check parent entity null
5. Verify parent entity state
6. Get child entity (find_by_id())
7. Check child entity null
8. Verify child entity ownership (optional, sometimes missing)
9. Perform action
```

**Occurrences:** 10+ (experiment routes accessing sample, prompt, cluster units)

### Sequence 3: Multiple Related Entity Access
```python
1. Extract user_id via JWT
2. Verify user exists
3. Get scraper_cluster (find_by_id_and_user())
4. Verify scraper_entity exists
5. Get scraper (find_by_id_and_user())
6. Verify sample exists
7. Get sample (find_by_id())
8. Verify cluster units exist
9. Get cluster units (find_many_by_ids())
10. Perform action
```

**Occurrences:** 5+ (complex experiment operations)

---

## 5. STATUS TYPE ENUMERATION

Current StatusType enum (app/utils/types.py):
```python
class StatusType(str, Enum):
    Initialized = "initialized"
    Ongoing = "ongoing"
    Paused = "paused"
    Completed = "completed"
    Error = "error"
```

**State Transitions Used:**
- Initialized -> Ongoing -> Completed
- Initialized -> Ongoing -> Paused -> Ongoing
- Ongoing -> Error (on exception)
- Completed -> never changes

**Issues:**
- No validation of valid state transitions
- No enum for stage fields (stages.scraping, stages.cluster_prep, etc.)
- No validation that transitions are legal

---

## 6. MISSING/INCONSISTENT PATTERNS

### 6.1 Ownership Validation for Derived Entities
Some entities are checked for existence but NOT for user ownership:
- Cluster units: Checked in filter_actions_routes.py but not ownership verified
- Prompts: Existence checked but sometimes no public/ownership check
- Samples: Existence checked but no direct ownership check

### 6.2 Data Consistency Validation
- No validation that cluster_unit.cluster_entity_id matches accessed scraper_cluster_id
- No validation that all IDs in array operations belong to user
- Filter operations don't validate all returned items

### 6.3 Cascade Validation
- When creating experiment, multiple related entities are accessed
- No transaction support if one fails partway through
- No rollback mechanism

### 6.4 Missing from Route Level
- No validation of array contents (e.g., cluster_unit_ids in extract_statements)
- No length/size validation
- No pagination bounds validation

### 6.5 Inconsistent Error Handling
- Some routes return jsonify with dict, others with string
- Some 409 Conflict responses include message, others error
- Some 400 Bad Request responses are for missing entities, others for state issues

---

## 7. EXISTING UTILITIES

### api_validation.py
- `validate_request_body(model)` - Validates JSON body against Pydantic model
- `validate_query_params(model)` - Validates query params with type preprocessing
- Consistent error response for validation failures

### types.py
- `StatusType` - Simple enum with 5 status values
- No state transition validation

### BaseRepository
- Standard CRUD operations
- User ownership filtering via `find_by_id_and_user()`
- Soft delete support
- Pydantic entity conversion

---

## 8. REFACTORING OPPORTUNITIES

### High Priority
1. **Create validation decorators** for common patterns:
   - `@require_user()` - Extract + validate user in one decorator
   - `@require_entity(EntityType, param_name)` - Get entity + validate ownership
   - `@require_status(stage, expected_status)` - Validate entity status

2. **Standardize error responses** with consistent format
   - Always use same response structure
   - Consistent status codes per error type
   - Clear error messages

3. **Centralize status transition validation**
   - Create `StatusValidator` class
   - Define allowed transitions
   - Validate before any status change

### Medium Priority
4. **Add ownership validation for derived entities**
   - Verify cluster units belong to accessed scraper_cluster
   - Verify prompts are public or user-owned
   - Verify samples belong to accessed scraper_cluster

5. **Create composite validation helpers**
   - `validate_scraper_cluster_with_user()`
   - `validate_cluster_unit_with_user()`
   - Combine multiple checks into single call

6. **Add data consistency checks**
   - Validate array element ownership
   - Validate related entity IDs match

### Lower Priority
7. **Add transaction support** for multi-entity operations
8. **Create state machine validator** for complex workflows
9. **Add request/response logging decorator**

---

## Summary Statistics

- **Total Route Files:** 8
- **Total Routes:** 30+
- **User Verification Occurrences:** 25+ (HIGHLY REPETITIVE)
- **Entity Existence Checks:** 40+ (REPETITIVE)
- **Status Validation Checks:** 20+ (INCONSISTENT)
- **Error Response Formats:** 5+ variations
- **Status Codes Used:** 400, 401, 404, 409 (INCONSISTENT)

**Duplication Level:** HIGH - Validates same things repeatedly with slight variations

