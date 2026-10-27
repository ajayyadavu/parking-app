from datetime import datetime

from pydantic import BaseModel, Field

from app.models.user import UserRole


class RateOut(BaseModel):
    price_per_hour: float


class RateUpdate(BaseModel):
    price_per_hour: float = Field(gt=0, le=10000)


class StatsOut(BaseModel):
    drivers: int
    owners: int
    total_spots: int
    active_spots: int
    total_bookings: int
    pending: int
    accepted: int
    completed: int
    closed: int  # rejected + cancelled
    revenue: float
    price_per_hour: float


class AdminUserOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    role: UserRole
    created_at: datetime | None

    model_config = {"from_attributes": True}