import enum

from sqlalchemy import Column, DateTime, Enum, Float, ForeignKey, Integer, func
from sqlalchemy.orm import relationship

from app.database import Base


class BookingStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"
    cancelled = "cancelled"
    completed = "completed"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    spot_id = Column(Integer, ForeignKey("parking_spots.id"), nullable=False)
    status = Column(Enum(BookingStatus), default=BookingStatus.pending, nullable=False)

    # Request ke time driver kahan tha, kitni door, aur us waqt ka rate
    driver_latitude = Column(Float, nullable=False)
    driver_longitude = Column(Float, nullable=False)
    distance_km = Column(Float, nullable=False)
    price_per_hour = Column(Float, nullable=False)

    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    total_amount = Column(Float, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    driver = relationship("User", back_populates="bookings")
    spot = relationship("ParkingSpot", back_populates="bookings")