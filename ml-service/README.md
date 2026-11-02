# 🌊 AquaFlow & AquaTrack Unified ML Microservice

An enterprise-grade, privacy-preserving Machine Learning microservice built with **FastAPI**, **Scikit-Learn**, and **LightGBM** to power intelligent water consumption analytics for multi-unit apartment complexes.

---

## 📖 Quick Links
- **Presentation Guide & Cheat Sheet**: [`ML_PRESENTATION_GUIDE.md`](ML_PRESENTATION_GUIDE.md) *(Includes 30s pitch, file-by-file walkthrough, and top 10 viva Q&As)*
- **Interactive OpenAPI / Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Live Health Diagnostics**: [http://localhost:8000/health](http://localhost:8000/health)

---

## 🧠 Two Production ML Engines

| ML Engine | Model Algorithm | Target / Output | Rest Endpoint |
| :--- | :--- | :--- | :--- |
| **1. Consumption Forecaster** | **Random Forest Regressor** (`sklearn`) | Predicts next month's consumption in litres ($R^2 = 0.8433$) | `POST /predict` |
| **2. Multi-Flat Leak Detector** | **Quantile Gradient Boosting** (`LightGBM`) | Predicts $q_{10}, q_{50}, q_{95}$ bounds, risk score, and diagnosis | `POST /v1/leak/score` |

---

## 🗂️ Clean Project Directory Structure

```
ml-service/
├── main.py                     <- Unified FastAPI microservice (port 8000)
├── predict.py                  <- Random Forest consumption prediction engine
├── train_model.py              <- Unified training CLI (trains forecasting and/or leak models)
├── generate_dataset.py         <- Unified synthetic dataset generator
├── requirements.txt            <- Python dependencies
├── Dockerfile                  <- Production Docker containerization
├── ML_PRESENTATION_GUIDE.md    <- Presentation script and viva Q&A cheat sheet
│
├── app/                        <- Core FastAPI application package
│   ├── config.py               <- Thresholds, ports, and configuration loader
│   ├── features.py             <- 21-feature extraction pipeline for leak detection
│   ├── predictor.py            <- LightGBM multi-quantile leak scoring engine
│   ├── reasons.py              <- Explainable AI generator for human-readable diagnostic text
│   ├── fallback.py             <- Fail-safe statistical rule (Mean + 2*SD) if ML is offline
│   ├── schemas.py              <- Pydantic validation models for input/output contracts
│   ├── security.py             <- API Key authentication header validator (X-API-KEY)
│   └── logging_config.py       <- Formatted operational logger
│
├── data/                       <- Data Assets
│   ├── consumption_forecasting/
│   │   └── synthetic_water_usage.csv  <- 24-month household consumption training data
│   ├── leak_detection/
│   │   ├── synthetic/
│   │   │   ├── synthetic_water_usage.csv  <- Multi-flat 18-cycle leak benchmark CSV
│   │   │   └── synthetic_water_usage.json <- Multi-flat leak benchmark JSON
│   │   └── feedback/
│   │       └── leak_feedback_export.csv  <- Resident & owner ground-truth feedback
│   └── feedback/               <- Feedback directory
│
├── models/                     <- Persisted Model Binaries
│   ├── random_forest_model.pkl <- Trained Random Forest consumption forecaster (5.8 MB)
│   ├── model_q10.joblib        <- 10th percentile LightGBM model
│   ├── model_q50.joblib        <- 50th percentile median LightGBM model
│   ├── model_q95.joblib        <- 95th percentile upper threshold LightGBM model
│   └── model_version.json      <- Active model version (v1.1.0) and Pinball Loss metrics
│
├── training/                   <- Training, Generation, & Retraining Scripts
│   ├── train_consumption_forecaster.py <- Pipeline for Random Forest consumption forecaster
│   ├── train_leak_detector.py          <- Pipeline for LightGBM Quantile Leak Regressors
│   ├── generate_consumption_data.py    <- Generates 24-month consumption dataset
│   ├── generate_leak_data.py           <- Generates 18-cycle leak detection dataset
│   ├── evaluate_leak_detector.py       <- Benchmarks LightGBM vs baseline rule
│   └── retrain_from_feedback.py        <- Human-in-the-loop retraining with label anti-poisoning
│
├── reports/                    <- Performance Evaluation Reports
│   └── model_metrics.json      <- JSON audit containing R2, MAE, RMSE, and feature importances
│
└── tests/                      <- 100% Automated Pytest Suite (25 Tests Passing)
    ├── test_api.py             <- Tests health, auth, and batch scoring endpoints
    ├── test_prediction_api.py  <- Tests consumption forecasting validation and outputs
    ├── test_predictor.py       <- Tests quantile scoring bounds and fallback logic
    ├── test_features.py        <- Tests feature extraction and trend slopes
    └── test_edge_cases.py      <- Tests meter faults, vacancies, digit typos, and cold starts
```

---

## 🚀 Quick Execution Guide

### 1. Start the Microservice
```bash
py -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Run All Automated Tests
```bash
py -m pytest -v
```
*(Runs 25 automated tests covering APIs, models, feature extraction, and edge cases)*

### 3. Retrain Models
```bash
# Train both models
py train_model.py

# Or train individually
py train_model.py --model forecasting
py train_model.py --model leak
```

### 4. Regenerate Benchmark Data
```bash
py generate_dataset.py
```
