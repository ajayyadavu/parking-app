
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models  # noqa: F401
from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models.settings import AppSettings
from app.routers import admin, auth, booking, parking, ws

Base.metadata.create_all(bind=engine)


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

allowed_origins = [
    origin.strip()
    for origin in settings.CORS_ORIGINS.split(",")
    if origin.strip()
]

# Add the public frontend origin from ngrok.
frontend_ngrok = "https://squabble-subsystem-tree.ngrok-free.dev"
if frontend_ngrok not in allowed_origins:
    allowed_origins.append(frontend_ngrok)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(parking.router)
app.include_router(booking.router)
app.include_router(admin.router)
app.include_router(ws.router)


@app.get("/")
def home():
    return {"message": "Parking App API is running"}


@app.get("/health")
def health():
    return {"status": "ok"}
