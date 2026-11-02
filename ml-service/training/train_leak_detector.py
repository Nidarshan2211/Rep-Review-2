"""
AquaFlow - LightGBM Quantile Leak Detector Training Pipeline
Models: LightGBM Regressors for Quantiles alpha=0.10 (q10), 0.50 (q50), 0.95 (q95)
Features: 21 flat-level features including lag consumption, rolling statistics, household size, away periods, and peer comparisons.
Saves model binaries to models/model_q*.joblib and version metadata to models/model_version.json.
"""

import json
import os
from datetime import datetime
from pathlib import Path
import numpy as np
import pandas as pd
import lightgbm as lgb
import joblib

from app.schemas import FlatReadingInput
from app.features import extract_features, FEATURE_NAMES

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_FILE = BASE_DIR / "data" / "leak_detection" / "synthetic" / "synthetic_water_usage.json"
LEGACY_DATA_FILE = BASE_DIR / "data" / "synthetic" / "synthetic_water_usage.json"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


def train_leak_detector():
    print("=" * 70)
    print("AQUAFLOW - LEAK DETECTION (LIGHTGBM QUANTILE REGRESSION) TRAINING PIPELINE")
    print("=" * 70)

    target_data_file = DATA_FILE if DATA_FILE.exists() else LEGACY_DATA_FILE
    if not target_data_file.exists():
        from training.generate_leak_data import generate_leak_dataset
        print("Dataset not found. Generating synthetic multi-flat leak dataset...")
        generate_leak_dataset()
        target_data_file = DATA_FILE if DATA_FILE.exists() else LEGACY_DATA_FILE

    print(f"Loading synthetic dataset from {target_data_file}...")
    with open(target_data_file, "r", encoding="utf-8") as f:
        records = json.load(f)

    # Train strictly on normal (non-leak) cycles with valid history (>= 2 past cycles)
    train_records = [
        r for r in records
        if not r.get("is_leak", False)
        and r.get("occupancy_active", True)
        and len(r.get("past_usage_kl", [])) >= 2
    ]

    print(f"Total records in dataset : {len(records)}")
    print(f"Normal baseline records  : {len(train_records)} (used for training)")

    X_list = []
    y_list = []

    for r in train_records:
        flat_input = FlatReadingInput(**r)
        vec, meta = extract_features(flat_input)
        X_list.append(vec)
        y_list.append(meta["daily_usage_kl"])

    X = np.array(X_list, dtype=np.float64)
    y = np.array(y_list, dtype=np.float64)

    print(f"Feature matrix shape     : {X.shape} (21 features)")
    print(f"Target vector shape      : {y.shape} (Daily consumption in kL)")

    quantiles = [0.10, 0.50, 0.95]
    models = {}

    print("\nTraining Quantile Regressors:")
    for q in quantiles:
        q_label = f"q{int(q*100)}"
        print(f"  -> Fitting LightGBM for quantile alpha={q:.2f} ({q_label})...")
        model = lgb.LGBMRegressor(
            objective="quantile",
            alpha=q,
            n_estimators=120,
            learning_rate=0.05,
            max_depth=4,
            num_leaves=15,
            min_child_samples=5,
            random_state=42,
            verbose=-1
        )
        model.fit(X, y)
        models[q_label] = model

    # Save trained models
    joblib.dump(models["q10"], MODEL_DIR / "model_q10.joblib")
    joblib.dump(models["q50"], MODEL_DIR / "model_q50.joblib")
    joblib.dump(models["q95"], MODEL_DIR / "model_q95.joblib")

    # Compute baseline pinball losses
    losses = {}
    print("\nModel Pinball Losses:")
    for q_name, q_val in [("q10", 0.10), ("q50", 0.50), ("q95", 0.95)]:
        preds = models[q_name].predict(X)
        errors = y - preds
        loss = np.mean(np.maximum(q_val * errors, (q_val - 1.0) * errors))
        losses[f"pinball_loss_{q_name}"] = round(float(loss), 4)
        print(f"  - {q_name} Pinball Loss: {loss:.4f}")

    version_info = {
        "model_version": "v1.1.0",
        "training_date": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "training_samples": len(X),
        "features": FEATURE_NAMES,
        "metrics": losses
    }

    with open(MODEL_DIR / "model_version.json", "w", encoding="utf-8") as f:
        json.dump(version_info, f, indent=2)

    print(f"\nModel artifacts successfully saved to {MODEL_DIR}")
    print(f"Metadata recorded in {MODEL_DIR / 'model_version.json'}")
    print("=" * 70)
    return version_info


if __name__ == "__main__":
    train_leak_detector()

