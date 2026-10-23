from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class UserCreate(BaseModel):
    name: str
    phone: str
    email: EmailStr
    password: str = Field(min_length=6, max_length=72)
    role: UserRole = UserRole.driver


class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    email: EmailStr
    role: UserRole

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut