from pydantic import BaseModel, Field

from app.models.parking_spot import VehicleType


class SpotCreate(BaseModel):
    title: str = Field(min_length=3)
    address: str = Field(min_length=3)
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    capacity: int = Field(gt=0, le=500)
    vehicle_type: VehicleType = VehicleType.car


class SpotOut(BaseModel):
    id: int
    owner_id: int
    title: str
    address: str
    latitude: float
    longitude: float
    capacity: int
    available_slots: int
    vehicle_type: VehicleType
    is_active: bool

    model_config = {"from_attributes": True}


class NearbySpotOut(SpotOut):
    distance_km: float
    price_per_hour: float
    owner_name: str
