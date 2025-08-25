import datetime
from typing import Optional, Any, Tuple

import flask
from flask import jsonify
from pydantic import BaseModel


def get_or[T](a: T | None, other: T) -> T:
    if a is None:
        return other
    else:
        return a


def get_assert[T](a: T | None) -> T:
    if a is None:
        raise Exception("Cannot be null")
    else:
        return a


def utc_timestamp() -> datetime.datetime:
    """Use UTC time for all timestamps, because when Dutch timezone goes from +1 to +2 or the other way around, you get trouble."""
    return datetime.datetime.now(datetime.timezone.utc)


class ValueOrError[T]:
    """
    Either a value or an error. The error is supposed to be returned as HTTP response, using the function 'to_response'.
    """
    _return_value: Optional[T] = None

    _error_message: Optional[str] = None
    _status_code: Optional[int] = None

    @staticmethod
    def error(message: str, status_code: int) -> "ValueOrError[Any]":
        obj = ValueOrError[Any]()
        obj._error_message = message
        obj._status_code = status_code
        return obj

    @staticmethod
    def value[Q](return_value: Q) -> "ValueOrError[Q]":
        obj = ValueOrError[Q]()
        obj._return_value = return_value
        return obj

    def is_error(self) -> bool:
        is_err = self._error_message is not None

        if is_err and self._return_value is not None:
            raise Exception("Invalid ValueOrError object")

        return is_err

    def is_value(self) -> bool:
        is_hap = self._return_value is not None

        if is_hap and self._error_message is not None:
            raise Exception("Invalid ValueOrError object")

        return is_hap

    def to_response(self) -> Tuple[flask.Response, int]:
        """Returns a flask response that should be returned from route/controller functions."""
        if self.is_value():

            if isinstance(self._return_value, BaseModel):
                return jsonify(self._return_value.model_dump()), 200
            else:
                return jsonify(self._return_value), 200

        else:
            return jsonify(error=self._error_message), get_assert(self._status_code)

    def get_value(self) -> T:
        if self._return_value:
            return self._return_value
        else:
            raise Exception("This is an error, not a value")
