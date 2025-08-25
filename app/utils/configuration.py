import os
from typing import Dict, Optional, Type, no_type_check

from dotenv import load_dotenv
from flask import g


def is_production_environment() -> bool:
    return get_env_variable("APP_ENV", str, "development") == "production"


@no_type_check
def get_env_variable[T](variable_name: str, type_: Type[T], default: Optional[T] = None) -> T:
    # In case a variable is needed before the Flask context is initialized
    if not g:
        return Configuration().get_variable(variable_name, type_, default)

    if "configuration" not in g:
        g.configuration = Configuration()

    config = g.configuration
    return config.get_variable(variable_name, type_, default)


def is_variable_present(variable_name: str) -> bool:
    # In case a variable is needed before the Flask context is initialized
    if not g:
        return variable_name in Configuration().variables

    if "configuration" not in g:
        g.configuration = Configuration()

    config = g.configuration
    return variable_name in config.variables


class Configuration:
    def __init__(self) -> None:
        # Load the base env file.
        load_dotenv(os.path.join("config", "base.env"))

        # Load the environment specific env file.
        environment = os.getenv("APP_ENV", "development")
        env_path = os.path.join("config", f"{environment}.env")
        if os.path.exists(env_path):
            load_dotenv(env_path)
        else:
            raise Exception(f"{env_path} does not exist")

        self.variables: Dict[str, str] = os.environ.copy()

    @no_type_check
    def get_variable[T](self, variable_name: str, t: Type[T], default: Optional[T] = None) -> T:
        var = self.variables.get(variable_name)
        if var is None:
            if default is None:
                raise Exception(f"Environment variable '{variable_name}' is not present.")
            else:
                return default

        # First try to convert it to int, then float, otherwise return a string
        if t == int:
            return int(var)
        elif t == float:
            return float(var)
        elif t == str:
            return var
        elif t == bool:
            return var == "true"
        else:
            raise Exception(f"Unknown type '{t}'")
