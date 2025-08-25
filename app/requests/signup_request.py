from pydantic import BaseModel

from app.database.entities.user_entity import UserRole


class SignupRequest(BaseModel):
    email: str
    password: str
    role: UserRole = UserRole.Default
