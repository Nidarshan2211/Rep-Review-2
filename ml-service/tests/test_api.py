import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)
VALID_KEY = settings.ml_api_key


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("ok", "UP")
    assert "model_version" in data
    assert data["schema_version"] == settings.schema_version


def test_model_info_security():
    # Missing API key -> 401
    resp_no_key = client.get("/v1/model/info")
    assert resp_no_key.status_code == 401

    # Wrong API key -> 403
    resp_bad_key = client.get("/v1/model/info", headers={"X-API-KEY": "wrong-secret"})
    assert resp_bad_key.status_code == 403

    # Valid API key -> 200
    resp_valid = client.get("/v1/model/info", headers={"X-API-KEY": VALID_KEY})
    assert resp_valid.status_code == 200
    assert "model_version" in resp_valid.json()
    assert "feature_list" in resp_valid.json()


def test_score_batch_endpoint():
    payload = {
        "schema_version": 1,
        "billing_cycle_id": 10,
        "building_id": 1,
        "flats": [
            {
                "usage_id": 101,
                "apartment_id": 1,
                "apartment_number": "101",
                "unit_type": "2BHK",
                "floor_number": 1,
                "month": 6,
                "year": 2026,
                "days_in_cycle": 30,
                "current_usage_kl": 15.0,
                "past_usage_kl": [14.0, 14.5, 13.8],
                "past_days_in_cycle": [30, 30, 30],
                "household_size_avg_in_cycle": 3.0,
                "household_size_confirmed": True
            },
            {
                "usage_id": 102,
                "apartment_id": 2,
                "apartment_number": "102",
                "unit_type": "2BHK",
                "floor_number": 1,
                "month": 6,
                "year": 2026,
                "days_in_cycle": 30,
                "current_usage_kl": 42.0,  # Elevated spike
                "past_usage_kl": [14.0, 14.2, 13.9],
                "past_days_in_cycle": [30, 30, 30],
                "household_size_avg_in_cycle": 3.0,
                "household_size_confirmed": True
            }
        ]
    }

    response = client.post("/v1/leak/score", json=payload, headers={"X-API-KEY": VALID_KEY})
    assert response.status_code == 200
    data = response.json()
    assert "model_version" in data
    assert len(data["results"]) == 2

    r1 = data["results"][0]
    assert r1["usage_id"] == 101
    assert r1["status"] in ("NORMAL", "WATCH")

    r2 = data["results"][1]
    assert r2["usage_id"] == 102
    assert r2["status"] in ("POTENTIAL_LEAK", "HIGH_RISK_LEAK")
    assert r2["risk_score"] >= 0.80
