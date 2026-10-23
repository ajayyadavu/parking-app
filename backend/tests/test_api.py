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


def test_protected_route_needs_token():
    assert client.get("/auth/me").status_code == 401