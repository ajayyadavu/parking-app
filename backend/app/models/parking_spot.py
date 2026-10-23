import enum

from sqlalchemy import Boolean, Column, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.database import Base


class VehicleType(str, enum.Enum):
    bike = "bike"
    car = "car"


class ParkingSpot(Base):
    __tablename__ = "parking_spots"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=False)
    available_slots = Column(Integer, nullable=False)
    vehicle_type = Column(Enum(VehicleType), default=VehicleType.car, nullable=False)
    is_active = Column(Boolean, default=True)

    owner = relationship("User", back_populates="parking_spots")
    bookings = relationship("Booking", back_populates="spot")