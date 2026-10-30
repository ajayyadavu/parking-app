from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.database import get_db
from app.models.parking_spot import ParkingSpot, VehicleType
from app.models.user import User, UserRole
from app.schemas.parking_spot import NearbySpotOut, SpotCreate, SpotOut
from app.services.search import find_nearby

router = APIRouter(prefix="/parking", tags=["Parking"])


@router.post("", response_model=SpotOut, status_code=201)
def add_spot(
    data: SpotCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
):
    spot = ParkingSpot(
        owner_id=user.id,
        title=data.title,
        address=data.address,
        latitude=data.latitude,
        longitude=data.longitude,
        capacity=data.capacity,
        available_slots=data.capacity,
        vehicle_type=data.vehicle_type,
    )
    db.add(spot)
    db.commit()
    db.refresh(spot)
    return spot


@router.get("/my", response_model=list[SpotOut])
def my_spots(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
):
    return (
        db.query(ParkingSpot)
        .filter(ParkingSpot.owner_id == user.id)
        .order_by(ParkingSpot.id.desc())
        .all()
    )


@router.put("/{spot_id}/toggle", response_model=SpotOut)
def toggle_spot(
    spot_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.owner, UserRole.admin)),
):
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == spot_id).first()
    if not spot or (spot.owner_id != user.id and user.role != UserRole.admin):
        raise HTTPException(status_code=404, detail="Parking spot not found")
    spot.is_active = not spot.is_active
    db.commit()
    db.refresh(spot)
    return spot


@router.get("/nearby", response_model=list[NearbySpotOut])
def nearby_spots(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(5, gt=0, le=50),
    vehicle_type: VehicleType | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return find_nearby(db, lat, lng, radius_km, vehicle_type)