from pydantic import BaseModel


class ModelId(BaseModel):
    model_id: str