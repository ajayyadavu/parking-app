from sqlalchemy import Column, Float, Integer

from app.database import Base


class AppSettings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    price_per_hour = Column(Float, nullable=False, default=20)