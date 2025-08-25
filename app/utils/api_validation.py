from typing import Any, Callable, Dict, Type, TypeVar, Annotated, Union, get_args, get_origin, List

from flask import jsonify, request
from pydantic import BaseModel, ValidationError, Field

from app.utils import get_assert

LANGUAGE_STR = Annotated[str, Field(pattern=r'^[a-z]{2}(-[A-Z]{2})?$')]

# Type variable for BaseModel subclasses
T = TypeVar("T", bound=BaseModel)


def validate_request_body(model: Type[T]) -> Callable:
    """
    A decorator to validate the request body against a Pydantic model.

    Args:
        model (Type[T]): The Pydantic model to validate against.

    Returns:
        Callable: The decorated function.
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                validated_body = model(**request.get_json())  # Validate the request body
                kwargs["body"] = validated_body
            except ValidationError as e:
                return jsonify({"error": "Invalid request", "details": e.errors()}), 400
            return func(*args, **kwargs)
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator


def preprocess_query_params(model: Type[BaseModel], query_params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Preprocess query parameters to cast them to the correct types, handling lists and single values.

    Args:
        model (Type[BaseModel]): The Pydantic model with field annotations.
        query_params (Dict[str, Any]): The raw query parameters from the request.

    Returns:
        Dict[str, Any]: Preprocessed query parameters with appropriate types.
    """
    preprocessed_params: Dict[str, Any] = {}
    for field, field_info in model.model_fields.items():
        field_type = get_assert(field_info.annotation)
        origin = get_origin(field_type)
        args = get_args(field_type)

        if field in query_params:
            value = query_params[field]

            # Handle Optional[List[T]] correctly
            if origin is Union and type(None) in args:
                field_type = next(arg for arg in args if arg is not type(None))
                origin = get_origin(field_type)
                args = get_args(field_type)

            # Handle lists correctly
            if origin is list:
                _preprocess_list(field, field_type, preprocessed_params, value)
            elif field_type is bool:
                preprocessed_params[field] = value[0].lower() == "true"
            else:
                try:
                    # Extract single value from list if needed
                    if isinstance(value, list) and len(value) == 1:
                        value = value[0]
                    preprocessed_params[field] = field_type(value)
                except (ValueError, TypeError):
                    preprocessed_params[field] = value  # Leave unprocessed for validation
    return preprocessed_params


def validate_query_params(model: Type[T]) -> Callable:
    """
    A decorator to validate query parameters against a Pydantic model.

    Args:
        model (Type[T]): The Pydantic model to validate against.

    Returns:
        Callable: The decorated function.
    """
    def decorator(func: Callable) -> Callable:
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                # Preprocess and validate query parameters
                query_params = preprocess_query_params(model, request.args.to_dict(flat=False))
                validated_query = model(**query_params)
                kwargs["query"] = validated_query
            except ValidationError as e:
                return jsonify({"error": "Invalid query parameters", "details": e.errors()}), 400
            return func(*args, **kwargs)
        wrapper.__name__ = func.__name__
        return wrapper
    return decorator


def _preprocess_list(field: str, field_type: Any, preprocessed_params: Dict[str, Any], value: Any) -> None:
    """
    Handle lists from query parameters correctly, supporting comma-separated and repeated values.
    """
    if not isinstance(value, list):
        value = [value]

    parsed_values: List[Any] = []
    for item in value:
        if isinstance(item, str) and "," in item:
            parsed_values.extend(item.split(","))
        else:
            parsed_values.append(item)

    try:
        element_type = get_args(field_type)[0]  # Extract inner type of List[T]
        preprocessed_params[field] = [element_type(item) for item in parsed_values]
    except (ValueError, TypeError):
        preprocessed_params[field] = parsed_values
