from math import cos, radians

from sqlalchemy.orm import Session

from app.models.parking_spot import ParkingSpot, VehicleType
from app.models.settings import AppSettings
from app.schemas.parking_spot import NearbySpotOut, SpotOut
from app.services.distance import haversine_km


def find_nearby(
    db: Session,
    lat: float,
    lng: float,
    radius_km: float,
    vehicle_type: VehicleType | None = None,
) -> list[NearbySpotOut]:
    # Pehle ek chhota box se database me filter, phir exact distance Python me
    lat_delta = radius_km / 111
    lng_delta = radius_km / (111 * max(cos(radians(lat)), 0.01))

    query = db.query(ParkingSpot).filter(
        ParkingSpot.is_active == True,  # noqa: E712
        ParkingSpot.available_slots > 0,
        ParkingSpot.latitude.between(lat - lat_delta, lat + lat_delta),
        ParkingSpot.longitude.between(lng - lng_delta, lng + lng_delta),
    )
    if vehicle_type:
        query = query.filter(ParkingSpot.vehicle_type == vehicle_type)

    app_settings = db.query(AppSettings).first()
    price = app_settings.price_per_hour if app_settings else 20

    results = []
    for spot in query.all():
        distance = haversine_km(lat, lng, spot.latitude, spot.longitude)
        if distance <= radius_km:
            results.append(
                NearbySpotOut(
                    **SpotOut.model_validate(spot).model_dump(),
                    distance_km=round(distance, 2),
                    price_per_hour=price,
                    owner_name=spot.owner.name,
                )
            )

    results.sort(key=lambda s: s.distance_km)
    return results