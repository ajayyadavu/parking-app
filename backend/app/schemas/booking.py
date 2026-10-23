from datetime import datetime

from pydantic import BaseModel, Field

from app.models.booking import BookingStatus


class BookingCreate(BaseModel):
    spot_id: int
    driver_latitude: float = Field(ge=-90, le=90)
    driver_longitude: float = Field(ge=-180, le=180)


class BookingOut(BaseModel):
    id: int
    status: BookingStatus
    created_at: datetime | None
    start_time: datetime | None
    end_time: datetime | None
    total_amount: float | None
    price_per_hour: float
    distance_km: float
    driver_latitude: float
    driver_longitude: float
    spot_id: int
    spot_title: str
    spot_address: str
    spot_latitude: float
    spot_longitude: float
    driver_name: str
    driver_phone: str | None  # accept hone ke baad hi dikhega
    owner_name: str
    owner_phone: str | None  # accept hone ke baad hi dikhega