import uuid

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_register_login_me():
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"

    res = client.post(
        "/auth/register",
        json={
            "name": "Test User",
            "phone": "9999999999",
            "email": email,
            "password": "secret123",
            "role": "driver",
        },
    )
    assert res.status_code == 201
    assert "password" not in res.json()

    res = client.post("/auth/login", data={"username": email, "password": "secret123"})
    assert res.status_code == 200
    token = res.json()["access_token"]

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["email"] == email


def test_admin_cannot_self_register():
    res = client.post(
        "/auth/register",
        json={
            "name": "Hacker",
            "phone": "1",
            "email": f"x_{uuid.uuid4().hex[:8]}@example.com",
            "password": "secret123",
            "role": "admin",
        },
    )
    assert res.status_code == 400


def test_admin_routes_are_protected():
    # Bina token ke
    assert client.get("/admin/stats").status_code == 401

    # Driver token se
    email = f"drv_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/auth/register",
        json={
            "name": "Driver",
            "phone": "9999999999",
            "email": email,
            "password": "secret123",
            "role": "driver",
        },
    )
    login = client.post("/auth/login", data={"username": email, "password": "secret123"})
    token = login.json()["access_token"]

    res = client.get("/admin/stats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


    def test_websocket_rejects_invalid_token():
    import pytest
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws?token=not-a-real-token"):
            pass



            def test_ai_requires_login():
    res = client.post("/ai/parse", json={"text": "parking near me"})
    assert res.status_code == 401


def test_sanitize_intent_clamps_bad_model_output():
    from app.services.ai_service import sanitize_intent

    out = sanitize_intent(
        {
            "place": "  Connaught Place  ",
            "use_current_location": True,
            "vehicle_type": "truck",
            "duration_hours": 500,
            "radius_km": 3,
        }
    )
    assert out["place"] == "Connaught Place"
    assert out["use_current_location"] is False  # place hai, to current location nahi
    assert out["vehicle_type"] is None
    assert out["duration_hours"] == 72.0
    assert out["radius_km"] == 5


    def test_rule_parser_hinglish():
    from app.services.ai_service import parse_intent

    out = parse_intent("mujhe Connaught Place ke paas 2 ghante ke liye car parking chahiye")
    assert out["place"].lower() == "connaught place"
    assert out["vehicle_type"] == "car"
    assert out["duration_hours"] == 2.0
    assert out["use_current_location"] is False


def test_rule_parser_near_me_and_radius():
    from app.services.ai_service import parse_intent

    out = parse_intent("bike parking near me for 30 minutes")
    assert out["use_current_location"] is True
    assert out["place"] is None
    assert out["vehicle_type"] == "bike"
    assert out["duration_hours"] == 0.5

    out = parse_intent("Karol Bagh me car parking, 2 km ke andar")
    assert out["place"].lower() == "karol bagh"
    assert out["radius_km"] == 2

def test_protected_route_needs_token():
    assert client.get("/auth/me").status_code == 401