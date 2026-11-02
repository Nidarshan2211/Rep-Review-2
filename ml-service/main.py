"""
AquaFlow / AquaTrack - Unified Machine Learning Microservice
Combines both production AI engines in a single, high-performance FastAPI service:
  1. Consumption Forecasting Engine: Random Forest Regressor (/predict)
  2. Leak Detection & Anomaly Engine: LightGBM Quantile Regressors (/v1/leak/score, /v1/model/info)
  3. Unified Health & Diagnostics: (/health)
"""

import os
import sys
import logging
from contextlib import asynccontextmanager
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Security, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Ensure ml-service root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Import model engines and schemas
from predict import predictor as consumption_predictor
from app.config import settings
from app.logging_config import setup_logging
from app.security import verify_api_key
from app.predictor import LeakPredictor
from app.schemas import (
    FlatReadingInput,
    FlatLeakResult,
    LeakScoreBatchRequest,
    LeakScoreBatchResponse,
    ModelInfoResponse
)
from app.features import FEATURE_NAMES as LEAK_FEATURE_NAMES

setup_logging()
logger = logging.getLogger("ml_service")

leak_predictor: Optional[LeakPredictor] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global leak_predictor
    logger.info("=" * 60)
    logger.info("STARTING AQUAFLOW UNIFIED ML MICROSERVICE")
    logger.info("=" * 60)

    # 1. Verify Consumption Forecaster (Random Forest)
    if consumption_predictor.is_ready():
        logger.info("[ML Engine 1/2] Random Forest Consumption Forecaster loaded successfully.")
    else:
        logger.warning("[ML Engine 1/2] Random Forest model binary missing or failed to load.")

    # 2. Initialize Leak Predictor (LightGBM Quantile)
    logger.info("[ML Engine 2/2] Initializing LightGBM Quantile Leak Predictor...")
    leak_predictor = LeakPredictor()
    logger.info(f"[ML Engine 2/2] Quantile Leak Predictor ready (Version: {leak_predictor.model_version})")
    logger.info("=" * 60)

    yield

    logger.info("Shutting down AquaFlow ML Microservice...")


app = FastAPI(
    title="AquaFlow & AquaTrack Unified ML Microservice",
    description="""
## Enterprise AI Core for Smart Water Billing & Analytics

This microservice provides two complementary machine learning engines:

### 1. 🔮 Consumption Forecasting Engine (`/predict`)
- **Algorithm**: Random Forest Regressor (`scikit-learn`)
- **Features**: Lagged consumption ($t-1, t-2, t-3$), 3-month rolling average, occupants count, calendar month, and trend slope.
- **Output**: Accurate expected household consumption in litres for next billing cycle.
- **Spring Boot Caller**: `PredictionMlClient`

### 2. 💧 Leak Detection & Anomaly Engine (`/v1/leak/score`, `/v1/model/info`)
- **Algorithm**: Multi-Quantile Gradient Boosting (`LightGBM` for 10th, 50th, 95th percentiles)
- **Features**: 21 flat-level features including historical usage, household size changes, away periods, and peer comparisons.
- **Output**: Calibrated risk score [0.0 - 1.0], anomaly pattern, expected bounds ($q_{10}, q_{50}, q_{95}$), and explainable text reason.
- **Spring Boot Caller**: `MlClient`
    """,
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for local and Docker integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_leak_predictor() -> LeakPredictor:
    global leak_predictor
    if leak_predictor is None:
        logger.info("Lazily initializing LeakPredictor...")
        leak_predictor = LeakPredictor()
    return leak_predictor


# =====================================================================
# PYDANTIC SCHEMAS FOR CONSUMPTION FORECASTING
# =====================================================================
class PredictionRequest(BaseModel):
    household_id: Optional[int] = Field(default=None, description="Unique identifier for the household / apartment")
    previous_month_consumption: float = Field(..., ge=0, description="Consumption in litres for previous month (t-1)")
    two_months_ago_consumption: float = Field(..., ge=0, description="Consumption in litres for 2 months ago (t-2)")
    three_months_ago_consumption: float = Field(..., ge=0, description="Consumption in litres for 3 months ago (t-3)")
    three_month_average: Optional[float] = Field(default=None, ge=0, description="Rolling 3-month average in litres")
    residents_count: int = Field(..., ge=1, le=20, description="Number of household occupants (1-20)")
    prediction_month: int = Field(..., ge=1, le=12, description="Target calendar month (1-12)")
    previous_consumption_trend: Optional[float] = Field(default=None, description="Trend difference: (t-1 minus t-3)")

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


class UnifiedHealthResponse(BaseModel):
    status: str
    model_name: str
    model_version: str
    model_loaded: bool
    schema_version: int
    engines: Dict[str, Any]


# =====================================================================
# ROOT & HEALTH CHECK ENDPOINTS
# =====================================================================
@app.get("/", tags=["System Information"])
def root_info():
    """Returns general microservice information and interactive documentation links."""
    p_leak = get_leak_predictor()
    return {
        "service": "AquaFlow Unified ML Microservice",
        "status": "UP",
        "version": "1.0.0",
        "engines": {
            "consumption_forecasting": {
                "endpoint": "POST /predict",
                "model": consumption_predictor.model_name,
                "version": consumption_predictor.model_version,
                "ready": consumption_predictor.is_ready()
            },
            "leak_detection": {
                "endpoint": "POST /v1/leak/score",
                "model": "LightGBM Quantile Regressors (q10, q50, q95)",
                "version": p_leak.model_version,
                "ready": p_leak.model_version != "FALLBACK_RULE"
            }
        },
        "documentation": "/docs",
        "health": "/health"
    }


@app.get("/health", response_model=UnifiedHealthResponse, tags=["Diagnostics"])
def health_check():
    """
    Unified health check compatible with both Spring Boot ML clients:
    PredictionMlClient (expects model_loaded, status, model_name, model_version)
    MlClient (expects status, schema_version)
    """
    p_leak = get_leak_predictor()
    rf_ready = consumption_predictor.is_ready()
    leak_ready = p_leak.model_version != "FALLBACK_RULE"

    overall_status = "UP" if (rf_ready and leak_ready) else ("DEGRADED" if (rf_ready or leak_ready) else "DOWN")

    return {
        "status": overall_status,
        "model_name": consumption_predictor.model_name,
        "model_version": consumption_predictor.model_version,
        "model_loaded": rf_ready,
        "schema_version": settings.schema_version,
        "engines": {
            "consumption_forecaster": {
                "algorithm": "Random Forest Regressor",
                "version": consumption_predictor.model_version,
                "loaded": rf_ready,
                "status": "UP" if rf_ready else "DOWN"
            },
            "leak_detector": {
                "algorithm": "LightGBM Quantile Regressors",
                "version": p_leak.model_version,
                "loaded": leak_ready,
                "status": "UP" if leak_ready else "FALLBACK_RULE"
            }
        }
    }


# =====================================================================
# ENGINE 1: CONSUMPTION FORECASTING (/predict)
# =====================================================================
@app.post("/predict", response_model=PredictionResponse, tags=["1. Consumption Forecasting"])
def predict_water_consumption(request: PredictionRequest):
    """
    Predicts expected next-month water consumption in litres using Random Forest Regressor.
    Used by Spring Boot's PredictionMlClient during billing preparations.
    """
    if not consumption_predictor.is_ready():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Predictive Random Forest model is not initialized or model file is missing."
        )

    try:
        data = request.model_dump()
        pred_litres, pred_status = consumption_predictor.predict(data)

        return {
            "household_id": request.household_id,
            "prediction_month": request.prediction_month,
            "predicted_consumption_litres": pred_litres,
            "model_name": consumption_predictor.model_name,
            "model_version": consumption_predictor.model_version,
            "prediction_status": pred_status
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        logger.error(f"Prediction inference error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Prediction inference error: {str(e)}"
        )


# =====================================================================
# ENGINE 2: LEAK DETECTION & ANOMALY SCORING (/v1/leak/score)
# =====================================================================
@app.post("/v1/leak/score", response_model=LeakScoreBatchResponse, dependencies=[Depends(verify_api_key)], tags=["2. Leak Detection & Anomaly"])
def score_leak_batch(request: LeakScoreBatchRequest):
    """
    Evaluates a batch of flat water meter readings for consumption anomalies and leak patterns.
    Enforces max 500 flats per batch. Protected by X-API-KEY.
    Used by Spring Boot's MlClient during billing cycle finalization.
    """
    p = get_leak_predictor()

    if request.schema_version != settings.schema_version:
        logger.warning(f"Schema version mismatch: received {request.schema_version}, expected {settings.schema_version}")

    results = p.score_batch(request.flats)
    for r in results:
        if not r.model_version:
            r.model_version = p.model_version

    import datetime
    return LeakScoreBatchResponse(
        cycle_id=f"CYC-{request.billing_cycle_id}" if request.billing_cycle_id else None,
        model_version=p.model_version,
        scored_at=datetime.datetime.utcnow().isoformat() + "Z",
        results=results
    )


@app.get("/v1/model/info", response_model=ModelInfoResponse, dependencies=[Depends(verify_api_key)], tags=["2. Leak Detection & Anomaly"])
def model_info():
    """Returns metadata and evaluation metrics for the active Leak Detection model."""
    p = get_leak_predictor()
    info = p.model_info or {}

    return ModelInfoResponse(
        model_version=p.model_version,
        schema_version=settings.schema_version,
        training_date=info.get("training_date", "N/A"),
        metrics=info.get("metrics", {}),
        feature_list=info.get("features", LEAK_FEATURE_NAMES)
    )


# =====================================================================
# EXCEPTION HANDLER
# =====================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled error processing request {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": f"Internal server error in ML microservice: {str(exc)}"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
