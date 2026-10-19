import pytest
from fastapi.testclient import TestClient
from backend.app.core.database import init_db
from backend.app.main import app

# Ensure tables exist
init_db()

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c

def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

def test_analytics_overview(client):
    response = client.get("/api/analytics/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_observations" in data
    assert "high_priority_hotspots" in data

def test_map_markers(client):
    response = client.get("/api/observations/map-markers?limit=10")
    assert response.status_code == 200
    markers = response.json()
    assert isinstance(markers, list)

def test_observations_pagination(client):
    response = client.get("/api/observations?limit=5&offset=0")
    assert response.status_code == 200
    res = response.json()
    assert "total" in res
    assert "data" in res

def test_hotspots_endpoint(client):
    response = client.get("/api/hotspots?limit=5")
    assert response.status_code == 200
    hotspots = response.json()
    assert isinstance(hotspots, list)

def test_alerts_endpoint(client):
    response = client.get("/api/alerts?limit=5")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)

def test_create_observation_validation_error(client):
    invalid_payload = {
        "latitude": 150.0,
        "longitude": 45.0,
        "ocean": "Atlantic Ocean"
    }
    response = client.post("/api/observations", json=invalid_payload)
    assert response.status_code in [400, 422]

def test_create_observation_zero_zero_rejected(client):
    zero_zero_payload = {
        "latitude": 0.0,
        "longitude": 0.0,
        "ocean": "Atlantic Ocean"
    }
    response = client.post("/api/observations", json=zero_zero_payload)
    assert response.status_code == 400
    assert "rejected" in response.json()["detail"].lower()

def test_map_markers_ocean_filter(client):
    response = client.get("/api/observations/map-markers?ocean=Pacific+Ocean&limit=15")
    assert response.status_code == 200
    markers = response.json()
    assert len(markers) > 0
    for m in markers:
        assert m["ocean"] == "Pacific Ocean"
        assert m["latitude"] != 0.0 or m["longitude"] != 0.0
        assert -90.0 <= m["latitude"] <= 90.0
        assert -180.0 <= m["longitude"] <= 180.0

def test_admin_backup_endpoint(client):
    response = client.post("/api/admin/backup")
    assert response.status_code == 200
    res = response.json()
    assert res["status"] == "success"
    assert "backup_file" in res

def test_trends_historical(client):
    response = client.get("/api/trends/historical")
    assert response.status_code == 200
    data = response.json()
    assert "timeline" in data
    assert "total_timestamped_records" in data
