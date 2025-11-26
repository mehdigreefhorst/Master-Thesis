# Logging System Documentation

## Overview

This application uses a centralized, structured logging system following industry best practices. The system provides:

- **Structured JSON logs** for production (machine-readable)
- **Human-readable colored logs** for development
- **Automatic request tracking** with unique request IDs
- **Performance monitoring** with duration tracking
- **Security** via automatic credential redaction
- **Separate log files** by severity and layer

---

## Quick Start

### 1. Basic Logging in Any Module

```python
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

# Simple logging
logger.info("User logged in successfully")
logger.warning("API rate limit approaching")
logger.error("Database connection failed")

# Logging with context (recommended)
logger.info(
    "Order processed",
    extra={
        'extra_fields': {
            'order_id': order_id,
            'user_id': user_id,
            'total_amount': 99.99
        }
    }
)

# Logging exceptions (always use exc_info=True)
try:
    risky_operation()
except Exception as e:
    logger.error(f"Operation failed: {str(e)}", exc_info=True)
```

---

## Architecture Layers

### Routes Layer (Thin)
**Purpose**: Handle HTTP requests, validate auth, delegate to services

```python
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

@blueprint.route("/users/<user_id>", methods=["GET"])
@jwt_required()
def get_user(user_id: str):
    logger.info("Get user request", extra={'extra_fields': {'user_id': user_id}})

    try:
        # Auth check
        if not current_user:
            logger.warning("Unauthorized access", extra={'extra_fields': {'user_id': user_id}})
            return jsonify(error="Unauthorized"), 401

        # Delegate to service
        user_data = UserService().get_user(user_id)

        logger.info("User retrieved successfully")
        return jsonify(user_data), 200

    except Exception as e:
        logger.error(f"Failed to get user: {str(e)}", exc_info=True)
        return jsonify(error="Internal server error"), 500
```

**Key Points**:
- ✅ Log request entry with key parameters
- ✅ Log auth failures
- ✅ Log final outcome (success/failure)
- ❌ Don't log detailed business logic (that's the service's job)
- ❌ Don't let exceptions propagate silently

---

### Services Layer (Business Logic)
**Purpose**: Implement business logic, orchestrate operations

```python
from app.utils.logging_config import get_logger

logger = get_logger(__name__)

class UserService:

    def create_user(self, user_data: dict) -> dict:
        logger.info("Creating user", extra={'extra_fields': {'email': user_data.get('email')}})

        try:
            # Validation
            if not self._validate(user_data):
                logger.warning("User validation failed")
                raise ValueError("Invalid user data")

            # Business logic
            user = self.user_repository.insert(user_data)

            logger.info("User created", extra={'extra_fields': {'user_id': user['id']}})
            return user

        except ValueError as e:
            # Expected business errors - warning level
            logger.warning(f"User creation failed: {str(e)}")
            raise

        except Exception as e:
            # Unexpected errors - error level with full stack trace
            logger.error("Unexpected error creating user", exc_info=True)
            raise
```

**Key Points**:
- ✅ Log method entry with non-sensitive parameters
- ✅ Log important business decisions
- ✅ Distinguish expected vs unexpected errors
- ✅ Log successful completion with relevant IDs
- ❌ Don't log sensitive data (passwords, tokens)

---

### Repository Layer (Database)
**Purpose**: Handle database operations

```python
from app.utils.logging_config import get_logger, log_database_operation

logger = get_logger(__name__)

class UserRepository:

    @log_database_operation('insert')  # Auto-logs operation + duration
    def insert(self, user_data: dict) -> dict:
        try:
            result = self.collection.insert_one(user_data)

            logger.debug(
                "User inserted",
                extra={'extra_fields': {
                    'user_id': str(result.inserted_id),
                    'collection': 'users'
                }}
            )

            return {"id": str(result.inserted_id), **user_data}

        except Exception as e:
            logger.error(
                "Database insert failed",
                exc_info=True,
                extra={'extra_fields': {
                    'collection': 'users',
                    'operation': 'insert'
                }}
            )
            raise
```

**Key Points**:
- ✅ Use `@log_database_operation()` decorator for automatic timing
- ✅ Log at DEBUG level for normal operations
- ✅ Log at ERROR level for failures with full context
- ✅ Automatically warns if operation > 1 second

---

## Logging Levels Guide

| Level | When to Use | Examples |
|-------|-------------|----------|
| **DEBUG** | Detailed diagnostic info | Function entry/exit, variable values, query details |
| **INFO** | General operations | Request received, operation completed, user action |
| **WARNING** | Unexpected but recoverable | Validation failed, rate limit hit, retry attempt |
| **ERROR** | Operation failed | Database error, API failure, exception caught |
| **CRITICAL** | System-level failure | Service crash, unable to recover |

---

## What to Log

### ✅ DO Log:
- Request entry/exit with user context
- Authentication/authorization results
- Business logic decisions
- External API calls (start, duration, errors)
- Database operations
- Performance metrics (slow operations)
- Errors with full stack traces
- Important state changes

### ❌ DON'T Log:
- Passwords, tokens, API keys (auto-redacted)
- PII without explicit permission
- Excessive detail in loops
- Binary data or huge payloads
- Redundant information

---

## Log Files

Logs are automatically written to separate files:

| File | Content | Retention |
|------|---------|-----------|
| `logs/app.log` | All application logs (INFO+) | 10 files × 10MB |
| `logs/error.log` | Errors only (ERROR+) | 10 files × 10MB |
| `logs/database.log` | Database operations | 5 files × 10MB |
| `logs/services.log` | Service layer | 5 files × 10MB |
| `logs/routes.log` | API/routes | 5 files × 10MB |

---

## Configuration

Set via environment variables:

```bash
# Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
LOG_LEVEL=INFO

# Log directory
LOG_DIR=logs

# Use JSON format (true for production)
LOG_JSON=false

# Flask environment
FLASK_ENV=development
```

---

## Request Tracking

Every request automatically gets:

1. **Unique Request ID**: Tracks request across all layers
2. **User ID**: From JWT token (if authenticated)
3. **Duration**: Automatically measured
4. **Request/Response Headers**: Includes `X-Request-ID`

Example log output:
```json
{
  "timestamp": "2025-01-15T10:30:45.123Z",
  "level": "INFO",
  "logger": "app.routes.user_routes",
  "message": "User retrieved successfully",
  "request": {
    "method": "GET",
    "path": "/api/users/123",
    "remote_addr": "192.168.1.1",
    "request_id": "a7b3c9d2-e4f5-6789",
    "user_id": "user_abc123"
  },
  "performance": {
    "duration_ms": 145.23
  }
}
```

---

## Best Practices

### 1. Keep Routes Thin
```python
# ❌ BAD - Too much logic in route
@app.route("/users", methods=["POST"])
def create_user():
    logger.info("Creating user")
    # 50 lines of validation, business logic, DB calls...

# ✅ GOOD - Delegate to service
@app.route("/users", methods=["POST"])
def create_user():
    logger.info("Create user request")
    user = UserService().create_user(request.json)
    return jsonify(user), 201
```

### 2. Log with Context
```python
# ❌ BAD - No context
logger.info("User created")

# ✅ GOOD - Rich context
logger.info(
    "User created",
    extra={'extra_fields': {
        'user_id': user_id,
        'email': email,
        'signup_source': 'web'
    }}
)
```

### 3. Always Log Exceptions Properly
```python
# ❌ BAD - Lost stack trace
except Exception as e:
    logger.error(f"Error: {str(e)}")

# ✅ GOOD - Full stack trace
except Exception as e:
    logger.error(f"Error: {str(e)}", exc_info=True)
```

### 4. Use Appropriate Log Levels
```python
# ❌ BAD - Everything is ERROR
logger.error("User not found")  # This is expected, use WARNING
logger.error("Starting process")  # Use INFO

# ✅ GOOD - Correct levels
logger.warning("User not found")
logger.info("Starting process")
logger.error("Database connection failed", exc_info=True)
```

---

## Security

The logging system automatically redacts:

- Passwords: `"password": "***REDACTED***"`
- API keys: `"api_key": "***REDACTED***"`
- Tokens: `"token": "***REDACTED***"`
- Bearer tokens: `Bearer ***REDACTED***`
- Secrets: `"secret": "***REDACTED***"`

**Never log**:
- Credit card numbers
- Social security numbers
- Personal health information
- Other sensitive PII

---

## Performance Tips

1. **Use DEBUG level wisely** - Only when needed for troubleshooting
2. **Don't log in tight loops** - Aggregate or sample instead
3. **Lazy string formatting**:
   ```python
   # ❌ BAD - Always formats string
   logger.debug("Data: " + json.dumps(large_data))

   # ✅ GOOD - Only formats if DEBUG is enabled
   logger.debug("Data: %s", large_data)
   ```

---

## Monitoring & Alerting

### Log Analysis
Use these queries with log aggregation tools:

```bash
# Find errors from last hour
grep "ERROR" logs/error.log | grep "$(date -u +%Y-%m-%dT%H)"

# Find slow operations
grep "duration_ms" logs/app.log | awk '$NF > 1000'

# Find user's requests
grep "user_abc123" logs/routes.log
```

### Alert on:
- ERROR rate spike
- Slow operations (>1s)
- Authentication failures
- API errors from external services

---

## Examples from Real Code

### visualization_routes.py (Route)
```python
@visualization_bp.route("/", methods=["GET"])
@jwt_required()
def get_visualization():
    user_id = get_jwt_identity()
    logger.info("Visualization request", extra={'extra_fields': {'user_id': str(user_id)}})

    try:
        if not get_user_repository().find_by_id(user_id):
            logger.warning("Unauthorized access", extra={'extra_fields': {'user_id': str(user_id)}})
            return jsonify(error="No such user"), 401

        figures = OpenRouterAnalyticsService().generate_all_figures()

        logger.info("Visualizations generated", extra={'extra_fields': {'count': len(figures)}})
        return jsonify(figure_list=figures), 200

    except Exception as e:
        logger.error(f"Visualization failed: {str(e)}", exc_info=True)
        return jsonify(error="Failed to generate visualizations"), 500
```

### openrouter_analytics_service.py (Service)
```python
@staticmethod
def generate_all_figures() -> List[str]:
    logger.info("Starting figure generation")

    try:
        logger.debug("Fetching OpenRouter model data")
        openrouter_model = OpenRouterModelData.from_api_data()

        logger.debug(
            "Model data loaded",
            extra={'extra_fields': {
                'total_models': len(openrouter_model.model_data)
            }}
        )

        figures = [...]  # Generate figures

        logger.info(f"Successfully generated {len(figures)} figures")
        return figures

    except Exception as e:
        logger.error(f"Figure generation failed: {str(e)}", exc_info=True)
        raise
```

---

## Troubleshooting

### Logs not appearing?
1. Check LOG_LEVEL environment variable
2. Verify logs/ directory exists and is writable
3. Check LoggingConfig is initialized in run.py

### Too much noise?
1. Increase LOG_LEVEL (INFO → WARNING)
2. Configure third-party loggers in logging_config.py:
   ```python
   logging.getLogger('urllib3').setLevel(logging.WARNING)
   ```

### Need to debug specific module?
```python
# Temporarily increase verbosity for one module
logging.getLogger('app.services.experiment_service').setLevel(logging.DEBUG)
```

---

## Migration Guide

To add logging to existing code:

1. **Add logger at module level**:
   ```python
   from app.utils.logging_config import get_logger
   logger = get_logger(__name__)
   ```

2. **Log entry points** (routes, key service methods)
3. **Log errors** with `exc_info=True`
4. **Log important outcomes** (success/failure)
5. **Remove print statements** and replace with logging

**Start with INFO and ERROR levels, add DEBUG later if needed.**

---

## Additional Resources

- Python Logging Cookbook: https://docs.python.org/3/howto/logging-cookbook.html
- Structured Logging Best Practices: https://www.loggly.com/ultimate-guide/python-logging-basics/
- Flask Logging: https://flask.palletsprojects.com/en/latest/logging/
