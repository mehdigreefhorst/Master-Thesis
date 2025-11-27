# Decorator Solutions for Flask Routes

## 1. Combined JWT + User Validation Decorator

```python
# app/utils/validation_decorators.py
from functools import wraps
from typing import Optional, Dict, Callable, Any
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.database import get_user_repository
from app.database.entities.user_entity import UserEntity

# First, let's create a standardized error response helper
class ValidationError:
    def __init__(self, code: str, message: str, status_code: int = 400, details: Optional[Dict] = None):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details or {}
    
    def to_response(self):
        return jsonify({
            "success": False,
            "error": {
                "code": self.code,
                "message": self.message,
                "details": self.details
            }
        }), self.status_code

# Main decorator: Get user from JWT + database
def require_user(func: Callable) -> Callable:
    """
    Decorator that:
    1. Checks JWT is valid (@jwt_required)
    2. Gets user_id from JWT
    3. Fetches user from database
    4. Passes user as 'current_user' parameter to route handler
    5. Returns error if user not found
    
    Usage:
        @route("/endpoint")
        @require_user()
        def handler(current_user):
            # current_user is UserEntity object, guaranteed to exist
            ...
    """
    @wraps(func)
    @jwt_required()  # First check JWT is valid
    def wrapper(*args, **kwargs) -> Any:
        try:
            # Get user_id from JWT
            user_id = get_jwt_identity()
            
            # Fetch user from database
            current_user = get_user_repository().find_by_id(user_id)
            
            # Check if user exists
            if not current_user:
                error = ValidationError(
                    code="USER_NOT_FOUND",
                    message=f"User {user_id} not found in database",
                    status_code=401,
                    details={"user_id": str(user_id)}
                )
                return error.to_response()
            
            # Pass user to route handler
            kwargs['current_user'] = current_user
            return func(*args, **kwargs)
            
        except Exception as e:
            error = ValidationError(
                code="AUTHENTICATION_ERROR",
                message=f"Failed to authenticate user: {str(e)}",
                status_code=401
            )
            return error.to_response()
    
    return wrapper
```

### Usage Example

```python
# Before (Repeated in every route)
@scraper_cluster_bp.route("/", methods=["GET"])
@jwt_required()
def get_scraper_cluster_instances():
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    # ... rest of code

# After (Single decorator)
@scraper_cluster_bp.route("/", methods=["GET"])
@require_user()
def get_scraper_cluster_instances(current_user):
    # current_user is already fetched and validated
    scraper_entities = get_scraper_cluster_repository().find_by_user_id(current_user.id)
    # ... rest of code
```

---

## 2. Entity Requirement Decorator

```python
# app/utils/validation_decorators.py (add to above)
from typing import Type
from app.database.entities.base_entity import BaseEntity

def require_entity(
    repository_getter: Callable,
    entity_name: str,
    param_name: str,
    user_required: bool = False,
    user_param_name: str = 'user_id'
) -> Callable:
    """
    Decorator that:
    1. Gets entity ID from request body or query params
    2. Fetches entity from database
    3. Optionally validates user ownership
    4. Passes entity to route handler
    5. Returns standardized error if not found
    
    Args:
        repository_getter: Function that returns the repository
        entity_name: Human-readable entity name (e.g., "ScraperCluster")
        param_name: Parameter name in request body (e.g., "cluster_id")
        user_required: If True, validates user_id matches entity.user_id
        user_param_name: Name of user parameter in route handler
    
    Usage:
        @route("/prepare", methods=["POST"])
        @require_user()
        @require_entity(
            repository_getter=get_scraper_cluster_repository,
            entity_name="ScraperCluster",
            param_name="scraper_cluster_id",
            user_required=True
        )
        def prepare_cluster(current_user, scraper_cluster, body):
            # scraper_cluster is guaranteed to exist
            # If user_required=True, scraper_cluster.user_id == current_user.id
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            try:
                from flask import request
                
                # Get the entity ID from request
                if request.method in ['POST', 'PUT']:
                    data = request.get_json()
                else:  # GET
                    data = request.args.to_dict()
                
                entity_id = data.get(param_name)
                
                if not entity_id:
                    error = ValidationError(
                        code="MISSING_PARAMETER",
                        message=f"Required parameter '{param_name}' not found",
                        status_code=400,
                        details={"parameter": param_name}
                    )
                    return error.to_response()
                
                # Get repository and fetch entity
                repository = repository_getter()
                
                if user_required:
                    # Fetch with user validation
                    user_id = kwargs.get(user_param_name)
                    if not user_id:
                        error = ValidationError(
                            code="MISSING_USER",
                            message="User context required",
                            status_code=401
                        )
                        return error.to_response()
                    
                    entity = repository.find_by_id_and_user(user_id, entity_id)
                else:
                    # Fetch without user validation
                    entity = repository.find_by_id(entity_id)
                
                # Check if entity exists
                if not entity:
                    error = ValidationError(
                        code="ENTITY_NOT_FOUND",
                        message=f"{entity_name} not found",
                        status_code=404,
                        details={
                            "entity_type": entity_name,
                            "entity_id": str(entity_id)
                        }
                    )
                    return error.to_response()
                
                # Convert entity_name to snake_case for parameter
                param_var_name = ''.join(['_' + c.lower() if c.isupper() else c for c in entity_name]).lstrip('_')
                kwargs[param_var_name] = entity
                
                return func(*args, **kwargs)
                
            except Exception as e:
                error = ValidationError(
                    code="ENTITY_FETCH_ERROR",
                    message=f"Failed to fetch {entity_name}: {str(e)}",
                    status_code=500
                )
                return error.to_response()
        
        return wrapper
    return decorator
```

### Usage Example

```python
# Before (Repeated entity checks)
@clustering_bp.route("/prepare", methods=["POST"])
@validate_request_body(ScraperClusterId)
@jwt_required()
def prepare_cluster(body: ScraperClusterId):
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(
        user_id, 
        body.scraper_cluster_id
    )
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find scraper_cluster {body.scraper_cluster_id}"), 400
    
    # ... rest of code

# After (Decorators handle all validation)
@clustering_bp.route("/prepare", methods=["POST"])
@validate_request_body(ScraperClusterId)
@require_user()
@require_entity(
    repository_getter=get_scraper_cluster_repository,
    entity_name="ScraperCluster",
    param_name="scraper_cluster_id",
    user_required=True,
    user_param_name='current_user'
)
def prepare_cluster(current_user, scraper_cluster, body: ScraperClusterId):
    # current_user and scraper_cluster are both validated and passed in
    # ... rest of code (much cleaner!)
```

---

## 3. Status Validation Decorator

```python
# app/utils/validation_decorators.py (add to above)

def require_status(
    get_entity_from_kwargs: Callable[[Dict], Optional[Any]],
    status_checks: Dict[str, Any]
) -> Callable:
    """
    Decorator that validates entity status/state before executing route.
    
    Args:
        get_entity_from_kwargs: Function that extracts entity from kwargs
        status_checks: Dict of {field_path: expected_value}
                      Examples:
                      - {"scraper_entity_id": {"required": True}}
                      - {"stages.scraping": {"equals": StatusType.Completed}}
                      - {"stages.cluster_prep": {"not_equals": StatusType.Completed}}
    
    Usage:
        @route("/prepare", methods=["POST"])
        @require_user()
        @require_entity(...)
        @require_status(
            get_entity_from_kwargs=lambda kwargs: kwargs.get('scraper_cluster'),
            status_checks={
                "scraper_entity_id": {"required": True, "message": "Scraper must be initialized"},
                "stages.scraping": {"equals": StatusType.Completed, "message": "Scraping must be completed"},
                "stages.cluster_prep": {"not_equals": StatusType.Completed, "message": "Already prepared"}
            }
        )
        def prepare_cluster(current_user, scraper_cluster, body):
            # All status checks passed
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            try:
                # Get entity from kwargs
                entity = get_entity_from_kwargs(kwargs)
                
                if not entity:
                    error = ValidationError(
                        code="MISSING_ENTITY",
                        message="Entity required for status validation",
                        status_code=400
                    )
                    return error.to_response()
                
                # Check each status requirement
                for field_path, check_config in status_checks.items():
                    # Get field value using nested path (e.g., "stages.scraping")
                    value = entity
                    for part in field_path.split('.'):
                        value = getattr(value, part, None)
                    
                    # Check requirement type
                    if "required" in check_config and check_config["required"]:
                        if not value:
                            message = check_config.get("message", f"{field_path} is required")
                            error = ValidationError(
                                code="INVALID_STATE",
                                message=message,
                                status_code=409,
                                details={"field": field_path, "required": True}
                            )
                            return error.to_response()
                    
                    elif "equals" in check_config:
                        expected = check_config["equals"]
                        if value != expected:
                            message = check_config.get("message", f"{field_path} must be {expected}")
                            error = ValidationError(
                                code="INVALID_STATE",
                                message=message,
                                status_code=409,
                                details={"field": field_path, "expected": str(expected), "got": str(value)}
                            )
                            return error.to_response()
                    
                    elif "not_equals" in check_config:
                        expected = check_config["not_equals"]
                        if value == expected:
                            message = check_config.get("message", f"{field_path} cannot be {expected}")
                            error = ValidationError(
                                code="INVALID_STATE",
                                message=message,
                                status_code=409,
                                details={"field": field_path, "cannot_be": str(expected)}
                            )
                            return error.to_response()
                
                # All status checks passed
                return func(*args, **kwargs)
                
            except Exception as e:
                error = ValidationError(
                    code="STATUS_CHECK_ERROR",
                    message=f"Failed to validate status: {str(e)}",
                    status_code=500
                )
                return error.to_response()
        
        return wrapper
    return decorator
```

### Usage Example

```python
# Before (Repeated status checks)
@clustering_bp.route("/prepare", methods=["POST"])
@require_user()
def prepare_cluster(body: ScraperClusterId):
    # ... get user and scraper_cluster ...
    
    if not scraper_cluster.scraper_entity_id:
        return jsonify(message="scraper not initialized"), 409
    
    if scraper_cluster.stages.scraping != StatusType.Completed:
        return jsonify(message="scraper not completed"), 409
    
    if scraper_cluster.stages.cluster_prep == StatusType.Completed:
        return jsonify(message="already prepared"), 409
    
    # ... rest of code

# After (Single decorator)
@clustering_bp.route("/prepare", methods=["POST"])
@require_user()
@require_entity(
    repository_getter=get_scraper_cluster_repository,
    entity_name="ScraperCluster",
    param_name="scraper_cluster_id",
    user_required=True
)
@require_status(
    get_entity_from_kwargs=lambda kwargs: kwargs.get('scraper_cluster'),
    status_checks={
        "scraper_entity_id": {
            "required": True,
            "message": "Scraper must be initialized"
        },
        "stages.scraping": {
            "equals": StatusType.Completed,
            "message": "Scraping must be completed first"
        },
        "stages.cluster_prep": {
            "not_equals": StatusType.Completed,
            "message": "Cluster preparation already completed"
        }
    }
)
def prepare_cluster(current_user, scraper_cluster, body):
    # All validations passed!
    # ... proceed with business logic
```

---

## 4. Complete Example: One Route Before & After

### BEFORE: Lots of manual validation

```python
@clustering_bp.route("/prepare_cluster", methods=["POST"])
@validate_request_body(ScraperClusterId)
@jwt_required()
def prepare_cluster(body: ScraperClusterId):
    # MANUAL VALIDATION #1: User exists
    user_id = get_jwt_identity()
    current_user = get_user_repository().find_by_id(user_id)
    if not current_user:
        return jsonify(error="No such user"), 401
    
    # MANUAL VALIDATION #2: ScraperCluster exists and belongs to user
    scraper_cluster_entity = get_scraper_cluster_repository().find_by_id_and_user(
        user_id, 
        body.scraper_cluster_id
    )
    if not scraper_cluster_entity:
        return jsonify(error=f"Could not find scraper_cluster {body.scraper_cluster_id}"), 400
    
    # MANUAL VALIDATION #3: Scraper initialized
    if not scraper_cluster_entity.scraper_entity_id:
        return jsonify(message="scraper is not yet initialized"), 409
    
    # MANUAL VALIDATION #4: Scraper entity exists
    scraper_entity = get_scraper_repository().find_by_id_and_user(
        user_id, 
        scraper_cluster_entity.scraper_entity_id
    )
    if not scraper_entity:
        return jsonify(error=f"Scraper not found"), 400
    
    # MANUAL VALIDATION #5: Scraping completed
    if not scraper_cluster_entity.stages.scraping == StatusType.Completed:
        return jsonify(message="scraper is not completed yet"), 409
    
    # MANUAL VALIDATION #6: Cluster prep not already done
    if scraper_cluster_entity.stages.cluster_prep == StatusType.Completed:
        return jsonify(message="Cluster preparation is already completed"), 409
    
    # FINALLY: Do actual work
    scraper_cluster_entity.stages.scraping = StatusType.Completed
    scraper_cluster_entity.stages.cluster_prep = StatusType.Ongoing
    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)
    
    cluster_units_created = ClusterPrepService.start_preparing_clustering(scraper_cluster_entity)
    scraper_cluster_entity.stages.cluster_prep = StatusType.Completed
    get_scraper_cluster_repository().update(scraper_cluster_entity.id, scraper_cluster_entity)
    
    return jsonify(message=f"preparing cluster successful, {cluster_units_created} units created"), 200
```

### AFTER: Clean and simple

```python
@clustering_bp.route("/prepare_cluster", methods=["POST"])
@validate_request_body(ScraperClusterId)
@require_user()
@require_entity(
    repository_getter=get_scraper_cluster_repository,
    entity_name="ScraperCluster",
    param_name="scraper_cluster_id",
    user_required=True
)
@require_entity(
    repository_getter=get_scraper_repository,
    entity_name="Scraper",
    param_name="scraper_entity_id",  # Gets from scraper_cluster.scraper_entity_id
    user_required=True
)
@require_status(
    get_entity_from_kwargs=lambda kwargs: kwargs.get('scraper_cluster'),
    status_checks={
        "scraper_entity_id": {
            "required": True,
            "message": "Scraper must be initialized"
        },
        "stages.scraping": {
            "equals": StatusType.Completed,
            "message": "Scraping must be completed first"
        },
        "stages.cluster_prep": {
            "not_equals": StatusType.Completed,
            "message": "Cluster preparation already completed"
        }
    }
)
def prepare_cluster(current_user, scraper_cluster, scraper, body):
    # All validations passed! Just do the work
    scraper_cluster.stages.scraping = StatusType.Completed
    scraper_cluster.stages.cluster_prep = StatusType.Ongoing
    get_scraper_cluster_repository().update(scraper_cluster.id, scraper_cluster)
    
    cluster_units_created = ClusterPrepService.start_preparing_clustering(scraper_cluster)
    scraper_cluster.stages.cluster_prep = StatusType.Completed
    get_scraper_cluster_repository().update(scraper_cluster.id, scraper_cluster)
    
    return jsonify({
        "success": True,
        "message": "Cluster preparation successful",
        "units_created": cluster_units_created
    }), 200
```

---

## Summary

### Decorator System Benefits

1. **Eliminates duplication:** 25+ user checks become 1 decorator
2. **Consistent errors:** All errors follow same format
3. **Readable routes:** Business logic is clear, not buried in validation
4. **Testable:** Decorators can be tested independently
5. **Maintainable:** Change validation logic in one place
6. **Composable:** Stack decorators for complex scenarios
7. **Safe:** Validation happens before business logic

### Quick Copy-Paste Setup

```python
# 1. Create app/utils/validation_decorators.py (copy above code)
# 2. Update imports in your routes
# 3. Replace manual validation with decorators
# 4. Route handlers become focused on business logic

# That's it!
```

