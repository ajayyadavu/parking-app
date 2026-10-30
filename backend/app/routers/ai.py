import math
import time
from collections import defaultdict, deque

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_role
from app.database import get_db
from app.models.user import User, UserRole
from app.schemas.ai import ParseRequest, RecommendOut, RecommendRequest, SearchIntent
from app.services import ai_service
from app.services.search import find_nearby

router = APIRouter(prefix="/ai", tags=["Smart search"])

# Simple per-user limit: 20 requests per minute
LIMIT = 20
WINDOW = 60
_hits: dict[int, deque] = defaultdict(deque)


def check_rate(user: User):
    now = time.monotonic()
    hits = _hits[user.id]
    while hits and now - hits[0] > WINDOW:
        hits.popleft()
    if len(hits) >= LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.")
    hits.append(now)


@router.get("/status")
def status(user: User = Depends(get_current_user)):
    return {"enabled": ai_service.ai_enabled()}


@router.post("/parse", response_model=SearchIntent)
def parse(
    data: ParseRequest,
    user: User = Depends(require_role(UserRole.driver)),
):
    check_rate(user)
    return ai_service.parse_intent(data.text)


@router.post("/recommend", response_model=RecommendOut)
def recommend(
    data: RecommendRequest,
    db: Session = Depends(get_db),
    user: User = Depends(require_role(UserRole.driver)),
):
    check_rate(user)
    spots = find_nearby(db, data.lat, data.lng, data.radius_km, data.vehicle_type)[:8]
    if not spots:
        return RecommendOut(
            spot=None,
            reason="No parking is available in this area right now. Try a bigger radius.",
            estimated_cost=None,
            ai_generated=False,
        )

    summary = [
        {
            "id": s.id,
            "distance_km": s.distance_km,
            "free_slots": s.available_slots,
            "capacity": s.capacity,
        }
        for s in spots
    ]
    spot_id, reason = ai_service.recommend_spot(summary, data.duration_hours)
    chosen = next(s for s in spots if s.id == spot_id)

    hours = max(1, math.ceil(data.duration_hours))
    return RecommendOut(
        spot=chosen,
        reason=reason,
        estimated_cost=round(hours * chosen.price_per_hour, 2),
        ai_generated=False,
    )