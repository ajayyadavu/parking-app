from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Har API request ko database session dene ke liye
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()