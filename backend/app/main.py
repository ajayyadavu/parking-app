from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401
from app.config import settings
from app.database import SessionLocal
from app.models.settings import AppSettings
from app.routers import admin, ai, auth, booking, parking, ws




def seed_settings():
    db = SessionLocal()
    try:
        if not db.query(AppSettings).first():
            db.add(AppSettings(price_per_hour=20))
            db.commit()
    finally:
        db.close()


seed_settings()

app = FastAPI(title="Parking App API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(parking.router)
app.include_router(booking.router)
app.include_router(admin.router)
app.include_router(ai.router)
app.include_router(ws.router)


@app.get("/")
def home():
    return {"message": "Parking App API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}