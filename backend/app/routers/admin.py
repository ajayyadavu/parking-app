from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import require_role
from app.database import get_db
from app.models.booking import Booking, BookingStatus
from app.models.parking_spot import ParkingSpot
from app.models.settings import AppSettings
from app.models.user import User, UserRole
from app.routers.booking import to_out
from app.schemas.admin import AdminUserOut, RateOut, RateUpdate, StatsOut
from app.schemas.booking import BookingOut

router = APIRouter(prefix="/admin", tags=["Admin"])

admin_only = require_role(UserRole.admin)


def get_settings_row(db: Session) -> AppSettings:
    row = db.query(AppSettings).first()
    if not row:
        row = AppSettings(price_per_hour=20)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/settings", response_model=RateOut)
def read_rate(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    return RateOut(price_per_hour=get_settings_row(db).price_per_hour)


@router.put("/settings", response_model=RateOut)
def update_rate(
    data: RateUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(admin_only),
):
    row = get_settings_row(db)
    row.price_per_hour = data.price_per_hour
    db.commit()
    return RateOut(price_per_hour=row.price_per_hour)


@router.get("/stats", response_model=StatsOut)
def stats(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    roles = dict(db.query(User.role, func.count(User.id)).group_by(User.role).all())
    states = dict(
        db.query(Booking.status, func.count(Booking.id)).group_by(Booking.status).all()
    )
    revenue = (
        db.query(func.coalesce(func.sum(Booking.total_amount), 0))
        .filter(Booking.status == BookingStatus.completed)
        .scalar()
    )

    return StatsOut(
        drivers=roles.get(UserRole.driver, 0),
        owners=roles.get(UserRole.owner, 0),
        total_spots=db.query(func.count(ParkingSpot.id)).scalar(),
        active_spots=db.query(func.count(ParkingSpot.id))
        .filter(ParkingSpot.is_active.is_(True))
        .scalar(),
        total_bookings=sum(states.values()),
        pending=states.get(BookingStatus.pending, 0),
        accepted=states.get(BookingStatus.accepted, 0),
        completed=states.get(BookingStatus.completed, 0),
        closed=states.get(BookingStatus.rejected, 0)
        + states.get(BookingStatus.cancelled, 0),
        revenue=float(revenue or 0),
        price_per_hour=get_settings_row(db).price_per_hour,
    )


@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    return db.query(User).order_by(User.id.desc()).all()


@router.get("/bookings", response_model=list[BookingOut])
def list_bookings(db: Session = Depends(get_db), admin: User = Depends(admin_only)):
    rows = db.query(Booking).order_by(Booking.id.desc()).limit(100).all()
    return [to_out(b) for b in rows]