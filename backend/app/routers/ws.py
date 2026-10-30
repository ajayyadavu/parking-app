from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.config import settings
from app.core.websocket import manager
from app.database import SessionLocal
from app.models.user import User

router = APIRouter(tags=["Live"])


def user_id_from_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, TypeError, ValueError):
        return None

    db = SessionLocal()
    try:
        exists = db.query(User.id).filter(User.id == user_id).first()
    finally:
        db.close()
    return user_id if exists else None


@router.websocket("/ws")
async def live(ws: WebSocket, token: str = ""):
    user_id = user_id_from_token(token)
    if user_id is None:
        await ws.close(code=1008)
        return

    await manager.connect(user_id, ws)
    try:
        while True:
            await ws.receive_text()  # client ka "ping" connection zinda rakhta hai
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user_id, ws)