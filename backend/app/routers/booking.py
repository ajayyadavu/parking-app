from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.parking_spot import ParkingSpot
from app.models.settings import AppSettings
from app.models.user import User, UserRole
from app.schemas.booking import BookingCreate, BookingOut
from app.services.distance import haversine_km
from app.services.pricing import calculate_amount

router = APIRouter(prefix="/bookings", tags=["Bookings"])

ACTIVE = (BookingStatus.pending, BookingStatus.accepted)


def to_out(b: Booking) -> BookingOut:
    # Phone number tabhi share hota hai jab booking confirm ho
    shared = b.status in (BookingStatus.accepted, BookingStatus.completed)
    return BookingOut(
        id=b.id,
        status=b.status,
        created_at=b.created_at,
        start_time=b.start_time,
        end_time=b.end_time,
        total_amount=b.total_amount,
        price_per_hour=b.price_per_hour,
        distance_km=b.distance_km,
        driver_latitude=b.driver_latitude,
        driver_longitude=b.driver_longitude,
        spot_id=b.spot_id,
        spot_title=b.spot.title,
        spot_address=b.spot.address,
        spot_latitude=b.spot.latitude,
        spot_longitude=b.spot.longitude,
        driver_name=b.driver.name,
        driver_phone=b.driver.phone if shared else None,
        owner_name=b.spot.owner.name,
        owner_phone=b.spot.owner.phone if shared else None,
    )


def get_booking(db: Session, booking_id: int) -> Booking:
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking


def get_owner_booking(db: Session, booking_id: int, owner: User) -> Booking:
    booking = get_booking(db, booking_id)
    if booking.spot.owner_id != owner.id:
        raise HTTPException(status_code=403, detail="This is not your parking spot")
    return booking


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.driver)),
):
    spot = db.query(ParkingSpot).filter(ParkingSpot.id == data.spot_id).first()
    if not spot or not spot.is_active:
        raise HTTPException(status_code=404, detail="Parking spot not available")
    if spot.available_slots < 1:
        raise HTTPException(status_code=400, detail="No free slots at this spot")

    already = (
        db.query(Booking)
        .filter(
            Booking.driver_id == user.id,
            Booking.spot_id == spot.id,
            Booking.status.in_(ACTIVE),
        )
        .first()
    )
    if already:
        raise HTTPException(
            status_code=400, detail="You already have an active request for this spot"
        )

    app_settings = db.query(AppSettings).first()
    rate = app_settings.price_per_hour if app_settings else 20

    booking = Booking(
        driver_id=user.id,
        spot_id=spot.id,
        driver_latitude=data.driver_latitude,
        driver_longitude=data.driver_longitude,
        distance_km=round(
            haversine_km(
                data.driver_latitude, data.driver_longitude, spot.latitude, spot.longitude
            ),
            2,
        ),
        price_per_hour=rate,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return to_out(booking)


@router.get("/my", response_model=list[BookingOut])
def my_bookings(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.driver)),
):
    rows = (
        db.query(Booking)
        .filter(Booking.driver_id == user.id)
        .order_by(Booking.id.desc())
        .all()
    )
    return [to_out(b) for b in rows]


@router.get("/incoming", response_model=list[BookingOut])
def incoming_bookings(
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.owner)),
):
    rows = (
        db.query(Booking)
        .join(ParkingSpot, Booking.spot_id == ParkingSpot.id)
        .filter(ParkingSpot.owner_id == user.id)
        .order_by(Booking.id.desc())
        .all()
    )
    return [to_out(b) for b in rows]


@router.put("/{booking_id}/accept", response_model=BookingOut)
def accept_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.owner)),
):
    booking = get_owner_booking(db, booking_id, user)
    if booking.status != BookingStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending requests can be accepted")
    if booking.spot.available_slots < 1:
        raise HTTPException(status_code=400, detail="No free slots left")

    booking.spot.available_slots -= 1  # slot reserve
    booking.status = BookingStatus.accepted
    booking.start_time = datetime.now()
    db.commit()
    db.refresh(booking)
    return to_out(booking)


@router.put("/{booking_id}/reject", response_model=BookingOut)
def reject_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.owner)),
):
    booking = get_owner_booking(db, booking_id, user)
    if booking.status != BookingStatus.pending:
        raise HTTPException(status_code=400, detail="Only pending requests can be rejected")
    booking.status = BookingStatus.rejected
    db.commit()
    db.refresh(booking)
    return to_out(booking)


@router.put("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.driver)),
):
    booking = get_booking(db, booking_id)
    if booking.driver_id != user.id:
        raise HTTPException(status_code=403, detail="This is not your booking")
    if booking.status not in ACTIVE:
        raise HTTPException(status_code=400, detail="This booking can no longer be cancelled")

    if booking.status == BookingStatus.accepted:
        spot = booking.spot  # reserve kiya hua slot wapas
        spot.available_slots = min(spot.capacity, spot.available_slots + 1)

    booking.status = BookingStatus.cancelled
    db.commit()
    db.refresh(booking)
    return to_out(booking)


@router.put("/{booking_id}/complete", response_model=BookingOut)
def complete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.owner)),
):
    booking = get_owner_booking(db, booking_id, user)
    if booking.status != BookingStatus.accepted:
        raise HTTPException(status_code=400, detail="Only confirmed bookings can be completed")

    now = datetime.now()
    booking.end_time = now
    booking.total_amount = calculate_amount(booking.start_time, now, booking.price_per_hour)
    booking.status = BookingStatus.completed

    spot = booking.spot
    spot.available_slots = min(spot.capacity, spot.available_slots + 1)
    db.commit()
    db.refresh(booking)
    return to_out(booking)