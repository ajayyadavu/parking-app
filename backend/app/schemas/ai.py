from pydantic import BaseModel, Field

from app.models.parking_spot import VehicleType
from app.schemas.parking_spot import NearbySpotOut


class ParseRequest(BaseModel):
    text: str = Field(min_length=3, max_length=300)


class SearchIntent(BaseModel):
    place: str | None = None
    use_current_location: bool = False
    vehicle_type: VehicleType | None = None
    duration_hours: float | None = None
    radius_km: float | None = None


class RecommendRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: float = Field(default=5, gt=0, le=50)
    vehicle_type: VehicleType | None = None
    duration_hours: float = Field(default=1, gt=0, le=72)


class RecommendOut(BaseModel):
    spot: NearbySpotOut | None
    reason: str
    estimated_cost: float | None
    ai_generated: bool