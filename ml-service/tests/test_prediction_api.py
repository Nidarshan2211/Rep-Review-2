"""
AquaTrack - Unit & Integration Tests for Random Forest Prediction Microservice
Tests /health and /predict endpoints for successful and failure cases.
"""

import sys
import os
from fastapi.testclient import TestClient

# Add ml-service directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app
from predict import predictor

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["model_name"] == "Random Forest Regressor"
    assert data["model_version"] == "1.0.0"
    assert data["model_loaded"] is True

def test_successful_prediction():
    payload = {
        "household_id": 101,
        "previous_month_consumption": 24000.0,
        "two_months_ago_consumption": 22000.0,
        "three_months_ago_consumption": 21000.0,
        "three_month_average": 22333.33,
        "residents_count": 4,
        "prediction_month": 11,
        "previous_consumption_trend": 3000.0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["household_id"] == 101
    assert data["prediction_month"] == 11
    assert data["predicted_consumption_litres"] > 0
    assert data["model_name"] == "Random Forest Regressor"
    assert data["prediction_status"] == "SUCCESS"

def test_negative_consumption_validation():
    payload = {
        "household_id": 101,
        "previous_month_consumption": -500.0,  # Negative value
        "two_months_ago_consumption": 22000.0,
        "three_months_ago_consumption": 21000.0,
        "residents_count": 4,
        "prediction_month": 11
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422  # Unprocessable Entity (Pydantic validation)

def test_invalid_month_validation():
    payload = {
        "household_id": 101,
        "previous_month_consumption": 20000.0,
        "two_months_ago_consumption": 18000.0,
        "three_months_ago_consumption": 19000.0,
        "residents_count": 3,
        "prediction_month": 15  # Invalid month > 12
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422

def test_invalid_residents_count():
    payload = {
        "household_id": 101,
        "previous_month_consumption": 20000.0,
        "two_months_ago_consumption": 18000.0,
        "three_months_ago_consumption": 19000.0,
        "residents_count": 0,  # Invalid: must be >= 1
        "prediction_month": 6
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
