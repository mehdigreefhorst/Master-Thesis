"""
Centralized Logging Configuration for Flask Application

This module provides industry-standard logging configuration following best practices:
- Structured logging with JSON formatting
- Separate log files for different severity levels
- Request ID tracking for distributed tracing
- Performance monitoring
- Secure credential filtering
"""

import logging
import logging.handlers
import os
import json
import sys
import re
from datetime import datetime
from pathlib import Path
from typing import Optional
from functools import wraps
import time
from flask import request, g, has_request_context


class StructuredFormatter(logging.Formatter):
    """
    JSON formatter for structured logging.
    Produces machine-readable logs suitable for log aggregation tools (ELK, Datadog, etc.)
    """

    # Patterns to detect and redact sensitive information
    SENSITIVE_PATTERNS = [
        (re.compile(r'"password"\s*:\s*"[^"]*"', re.IGNORECASE), '"password": "***REDACTED***"'),
        (re.compile(r'"api[_-]?key"\s*:\s*"[^"]*"', re.IGNORECASE), '"api_key": "***REDACTED***"'),
        (re.compile(r'"token"\s*:\s*"[^"]*"', re.IGNORECASE), '"token": "***REDACTED***"'),
        (re.compile(r'"secret"\s*:\s*"[^"]*"', re.IGNORECASE), '"secret": "***REDACTED***"'),
        (re.compile(r'Bearer\s+[A-Za-z0-9\-._~+/]+=*', re.IGNORECASE), 'Bearer ***REDACTED***'),
    ]

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON with contextual information"""

        # Build base log entry
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add request context if available
        if has_request_context():
            log_data["request"] = {
                "method": request.method,
                "path": request.path,
                "remote_addr": request.remote_addr,
                "request_id": getattr(g, 'request_id', None),
                "user_id": getattr(g, 'user_id', None),
            }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info)
            }

        # Add custom fields from extra parameter
        if hasattr(record, 'extra_fields'):
            log_data["extra"] = record.extra_fields

        # Add performance metrics if present
        if hasattr(record, 'duration_ms'):
            log_data["performance"] = {
                "duration_ms": record.duration_ms
            }

        # Convert to JSON and redact sensitive information
        json_str = json.dumps(log_data, default=str)
        json_str = self._redact_sensitive_info(json_str)

        return json_str

    def _redact_sensitive_info(self, message: str) -> str:
        """Remove sensitive information from log messages"""
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            message = pattern.sub(replacement, message)
        return message


class HumanReadableFormatter(logging.Formatter):
    """
    Human-readable formatter for console output during development.
    Uses colors for better readability.
    """

    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',      # Cyan
        'INFO': '\033[32m',       # Green
        'WARNING': '\033[33m',    # Yellow
        'ERROR': '\033[31m',      # Red
        'CRITICAL': '\033[35m',   # Magenta
        'RESET': '\033[0m',       # Reset
    }

    def format(self, record: logging.LogRecord) -> str:
        """Format log record with colors for console output"""

        # Add color to level name
        color = self.COLORS.get(record.levelname, self.COLORS['RESET'])
        reset = self.COLORS['RESET']

        # Build readable format
        timestamp = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S.%f')[:-3]

        parts = [
            f"{timestamp}",
            f"{color}{record.levelname:8}{reset}",
            f"[{record.name}]",
            record.getMessage()
        ]

        # Add request ID if available
        if has_request_context() and hasattr(g, 'request_id'):
            parts.insert(3, f"[req:{g.request_id[:8]}]")

        # Add duration if available
        if hasattr(record, 'duration_ms'):
            parts.append(f"({record.duration_ms:.2f}ms)")

        formatted = " ".join(parts)

        # Add exception traceback if present
        if record.exc_info:
            formatted += "\n" + self.formatException(record.exc_info)

        return formatted


class LoggingConfig:
    """
    Centralized logging configuration manager.
    Handles setup of loggers, handlers, and formatters.
    """

    def __init__(self, app=None):
        self.app = app
        self.log_dir = None

        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        """Initialize logging for Flask application"""
        self.app = app

        # Get configuration from environment or defaults
        log_level = os.getenv('LOG_LEVEL', 'INFO').upper()
        log_dir = os.getenv('LOG_DIR', 'logs')
        use_json = os.getenv('LOG_JSON', 'false').lower() == 'true'

        # Create log directory
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)

        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG)  # Capture all levels

        # Remove existing handlers
        root_logger.handlers = []

        # Console handler (human-readable for development, JSON for production)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(getattr(logging, log_level))

        if use_json or os.getenv('FLASK_ENV') == 'production':
            console_handler.setFormatter(StructuredFormatter())
        else:
            console_handler.setFormatter(HumanReadableFormatter())

        root_logger.addHandler(console_handler)

        # File handlers with rotation
        self._setup_file_handlers(log_level, use_json)

        # Configure third-party loggers
        self._configure_third_party_loggers()

        # Add request hooks for request tracking
        self._setup_request_hooks()

        app.logger.info("Logging system initialized", extra={
            'extra_fields': {
                'log_level': log_level,
                'log_dir': str(self.log_dir),
                'json_logging': use_json
            }
        })

    def _setup_file_handlers(self, log_level: str, use_json: bool):
        """Setup rotating file handlers for different log levels"""

        formatter = StructuredFormatter() if use_json else HumanReadableFormatter()

        # General application log (INFO and above)
        app_handler = logging.handlers.RotatingFileHandler(
            self.log_dir / 'app.log',
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=10
        )
        app_handler.setLevel(getattr(logging, log_level))
        app_handler.setFormatter(formatter)
        logging.getLogger().addHandler(app_handler)

        # Error log (ERROR and above)
        error_handler = logging.handlers.RotatingFileHandler(
            self.log_dir / 'error.log',
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=10
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(formatter)
        logging.getLogger().addHandler(error_handler)

        # Database operations log
        db_handler = logging.handlers.RotatingFileHandler(
            self.log_dir / 'database.log',
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5
        )
        db_handler.setLevel(logging.DEBUG)
        db_handler.setFormatter(formatter)
        logging.getLogger('app.database').addHandler(db_handler)

        # Service layer log
        service_handler = logging.handlers.RotatingFileHandler(
            self.log_dir / 'services.log',
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5
        )
        service_handler.setLevel(logging.DEBUG)
        service_handler.setFormatter(formatter)
        logging.getLogger('app.services').addHandler(service_handler)

        # API/Routes log
        routes_handler = logging.handlers.RotatingFileHandler(
            self.log_dir / 'routes.log',
            maxBytes=10 * 1024 * 1024,  # 10 MB
            backupCount=5
        )
        routes_handler.setLevel(logging.DEBUG)
        routes_handler.setFormatter(formatter)
        logging.getLogger('app.routes').addHandler(routes_handler)

    def _configure_third_party_loggers(self):
        """Configure logging levels for third-party libraries"""

        # Reduce noise from verbose libraries
        logging.getLogger('urllib3').setLevel(logging.WARNING)
        logging.getLogger('werkzeug').setLevel(logging.WARNING)
        logging.getLogger('pymongo').setLevel(logging.WARNING)

        # You can adjust these based on your needs
        # logging.getLogger('openai').setLevel(logging.INFO)

    def _setup_request_hooks(self):
        """Setup Flask request hooks for tracking requests"""

        @self.app.before_request
        def before_request():
            """Track request start time and generate request ID"""
            import uuid
            g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
            g.request_start_time = time.time()

            # Try to get user_id from JWT if present
            try:
                from flask_jwt_extended import get_jwt_identity
                g.user_id = get_jwt_identity()
            except:
                g.user_id = None

            self.app.logger.info(
                f"Request started: {request.method} {request.path}",
                extra={
                    'extra_fields': {
                        'request_id': g.request_id,
                        'user_id': g.user_id,
                        'remote_addr': request.remote_addr,
                        'user_agent': request.headers.get('User-Agent', 'Unknown')
                    }
                }
            )

        @self.app.after_request
        def after_request(response):
            """Log request completion with duration"""
            if hasattr(g, 'request_start_time'):
                duration_ms = (time.time() - g.request_start_time) * 1000

                log_record = logging.LogRecord(
                    name=self.app.logger.name,
                    level=logging.INFO,
                    pathname='',
                    lineno=0,
                    msg=f"Request completed: {request.method} {request.path} - {response.status_code}",
                    args=(),
                    exc_info=None
                )
                log_record.duration_ms = duration_ms
                log_record.extra_fields = {
                    'request_id': getattr(g, 'request_id', None),
                    'status_code': response.status_code,
                    'user_id': getattr(g, 'user_id', None)
                }

                self.app.logger.handle(log_record)

            # Add request ID to response headers
            response.headers['X-Request-ID'] = getattr(g, 'request_id', 'unknown')
            return response

        @self.app.errorhandler(Exception)
        def handle_exception(error):
            """Log unhandled exceptions"""
            self.app.logger.error(
                f"Unhandled exception: {str(error)}",
                exc_info=True,
                extra={
                    'extra_fields': {
                        'request_id': getattr(g, 'request_id', None),
                        'user_id': getattr(g, 'user_id', None),
                        'path': request.path,
                        'method': request.method
                    }
                }
            )
            # Re-raise to let Flask handle it
            raise


def get_logger(name: str) -> logging.Logger:
    """
    Get a logger instance for a specific module.

    Usage:
        logger = get_logger(__name__)
        logger.info("Something happened")

    Args:
        name: Module name (typically __name__)

    Returns:
        Configured logger instance
    """
    return logging.getLogger(name)


def log_function_call(logger: Optional[logging.Logger] = None):
    """
    Decorator to log function entry, exit, and duration.

    Usage:
        @log_function_call()
        def my_function(arg1, arg2):
            pass

    Args:
        logger: Logger instance (if None, uses function's module logger)
    """
    def decorator(func):
        nonlocal logger
        if logger is None:
            logger = logging.getLogger(func.__module__)

        @wraps(func)
        def wrapper(*args, **kwargs):
            func_name = func.__qualname__

            # Log entry
            logger.debug(
                f"Entering {func_name}",
                extra={
                    'extra_fields': {
                        'function': func_name,
                        'args_count': len(args),
                        'kwargs_keys': list(kwargs.keys())
                    }
                }
            )

            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000

                # Log successful exit
                log_record = logging.LogRecord(
                    name=logger.name,
                    level=logging.DEBUG,
                    pathname='',
                    lineno=0,
                    msg=f"Exited {func_name}",
                    args=(),
                    exc_info=None
                )
                log_record.duration_ms = duration_ms
                log_record.extra_fields = {'function': func_name}
                logger.handle(log_record)

                return result

            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000

                # Log exception
                logger.error(
                    f"Exception in {func_name}: {str(e)}",
                    exc_info=True,
                    extra={
                        'extra_fields': {
                            'function': func_name,
                            'duration_ms': duration_ms
                        }
                    }
                )
                raise

        return wrapper
    return decorator


def log_database_operation(operation_type: str):
    """
    Decorator to log database operations with timing.

    Usage:
        @log_database_operation('insert')
        def insert_user(self, user_data):
            pass

    Args:
        operation_type: Type of operation (insert, update, delete, find, etc.)
    """
    def decorator(func):
        logger = logging.getLogger(func.__module__)

        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            func_name = func.__qualname__

            try:
                result = func(*args, **kwargs)
                duration_ms = (time.time() - start_time) * 1000

                # Log successful operation
                log_record = logging.LogRecord(
                    name=logger.name,
                    level=logging.DEBUG,
                    pathname='',
                    lineno=0,
                    msg=f"DB {operation_type}: {func_name}",
                    args=(),
                    exc_info=None
                )
                log_record.duration_ms = duration_ms
                log_record.extra_fields = {
                    'operation_type': operation_type,
                    'function': func_name
                }
                logger.handle(log_record)

                # Warn if operation is slow
                if duration_ms > 1000:  # 1 second
                    logger.warning(
                        f"Slow database operation: {func_name} took {duration_ms:.2f}ms",
                        extra={
                            'extra_fields': {
                                'operation_type': operation_type,
                                'duration_ms': duration_ms
                            }
                        }
                    )

                return result

            except Exception as e:
                duration_ms = (time.time() - start_time) * 1000
                logger.error(
                    f"DB operation failed: {operation_type} in {func_name}: {str(e)}",
                    exc_info=True,
                    extra={
                        'extra_fields': {
                            'operation_type': operation_type,
                            'duration_ms': duration_ms
                        }
                    }
                )
                raise

        return wrapper
    return decorator
