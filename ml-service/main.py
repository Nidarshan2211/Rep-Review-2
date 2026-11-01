"""
AquaTrack - Random Forest Water Consumption Prediction FastAPI Microservice
Provides /health and /predict endpoints for consumption forecasting.
"""

import os
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from predict import predictor

app = FastAPI(
    title="AquaTrack ML Prediction Microservice",
    description="Random Forest Regression Microservice for Household Water Consumption Forecasting",
    version="1.0.0"
)

# Enable CORS for local integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---
class PredictionRequest(BaseModel):
    household_id: Optional[int] = Field(default=None, description="Traceability identifier for the household")
    previous_month_consumption: float = Field(..., ge=0, description="Consumption in litres for previous month (t-1)")
    two_months_ago_consumption: float = Field(..., ge=0, description="Consumption in litres for 2 months ago (t-2)")
    three_months_ago_consumption: float = Field(..., ge=0, description="Consumption in litres for 3 months ago (t-3)")
    three_month_average: Optional[float] = Field(default=None, ge=0, description="Rolling 3-month average in litres")
    residents_count: int = Field(..., ge=1, le=20, description="Number of household occupants")
    prediction_month: int = Field(..., ge=1, le=12, description="Target calendar month (1-12)")
    previous_consumption_trend: Optional[float] = Field(default=None, description="Trend difference (t-1 minus t-3)")

    class Config:
        json_schema_extra = {
            "example": {
                "household_id": 101,
                "previous_month_consumption": 24000.0,
                "two_months_ago_consumption": 22000.0,
                "three_months_ago_consumption": 21000.0,
                "three_month_average": 22333.33,
                "residents_count": 4,
                "prediction_month": 11,
                "previous_consumption_trend": 3000.0
            }
        }

class PredictionResponse(BaseModel):
    household_id: Optional[int]
    prediction_month: int
    predicted_consumption_litres: float
    model_name: str
    model_version: str
    prediction_status: str

class HealthResponse(BaseModel):
    status: str
    model_name: str
    model_version: str
    model_loaded: bool

# --- Endpoints ---
@app.get("/health", response_model=HealthResponse)
def health_check():
    """
    Health check endpoint returning service status and model readiness.
    """
    is_ready = predictor.is_ready()
    return {
        "status": "UP" if is_ready else "DEGRADED",
        "model_name": predictor.model_name,
        "model_version": predictor.model_version,
        "model_loaded": is_ready
    }

@app.post("/predict", response_model=PredictionResponse)
def predict_water_consumption(request: PredictionRequest):
    """
    Predicts expected next-month water consumption in litres using Random Forest Regressor.
    """
    if not predictor.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Predictive Random Forest model is not initialized or model file is missing."
        )

    try:
        data = request.dict()
        pred_litres, pred_status = predictor.predict(data)

        return {
            "household_id": request.household_id,
            "prediction_month": request.prediction_month,
            "predicted_consumption_litres": pred_litres,
            "model_name": predictor.model_name,
            "model_version": predictor.model_version,
            "prediction_status": pred_status
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction inference error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)
