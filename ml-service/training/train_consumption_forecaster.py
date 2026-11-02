"""
AquaTrack - Random Forest Consumption Forecaster Training Pipeline
Model: RandomForestRegressor (100 estimators, max_depth=10)
Target: next_month_consumption (litres)
Evaluates MAE, RMSE, and R2 score via chronological split.
Saves model to models/random_forest_model.pkl and metrics to reports/model_metrics.json.
"""

import os
import json
from datetime import datetime
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

FEATURE_NAMES = [
    "previous_month_consumption",
    "two_months_ago_consumption",
    "three_months_ago_consumption",
    "three_month_average",
    "residents_count",
    "month_of_year",
    "previous_consumption_trend"
]

TARGET_NAME = "next_month_consumption"


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Transforms raw sequential monthly consumption records into chronological
    lagged feature vectors per household without future data leakage.
    """
    feature_rows = []

    for h_id, group in df.groupby("household_id"):
        group = group.sort_values(by="month_index").reset_index(drop=True)
        consumptions = group["consumption_litres"].values
        months_of_year = group["month_of_year"].values
        residents = group["residents_count"].values
        month_indices = group["month_index"].values

        # Need at least 3 previous months to predict month t
        for t in range(3, len(group)):
            lag1 = consumptions[t - 1]
            lag2 = consumptions[t - 2]
            lag3 = consumptions[t - 3]
            avg3 = (lag1 + lag2 + lag3) / 3.0
            trend = lag1 - lag3
            residents_count = residents[t]
            target_month = months_of_year[t]
            target_consumption = consumptions[t]
            month_idx = month_indices[t]

            feature_rows.append({
                "household_id": h_id,
                "month_index": month_idx,
                "previous_month_consumption": lag1,
                "two_months_ago_consumption": lag2,
                "three_months_ago_consumption": lag3,
                "three_month_average": round(avg3, 2),
                "residents_count": residents_count,
                "month_of_year": target_month,
                "previous_consumption_trend": round(trend, 2),
                "next_month_consumption": target_consumption
            })

    return pd.DataFrame(feature_rows)


def train_consumption_forecaster():
    print("=" * 70)
    print("AQUATRACK - CONSUMPTION FORECASTING (RANDOM FOREST) TRAINING PIPELINE")
    print("=" * 70)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    primary_dataset = os.path.join(base_dir, "data", "consumption_forecasting", "synthetic_water_usage.csv")
    legacy_dataset = os.path.join(base_dir, "dataset", "synthetic_water_usage.csv")

    dataset_path = primary_dataset if os.path.exists(primary_dataset) else legacy_dataset

    if not os.path.exists(dataset_path):
        from generate_dataset import generate_synthetic_water_dataset
        print("Dataset not found. Generating synthetic water consumption dataset...")
        generate_synthetic_water_dataset()
        dataset_path = primary_dataset if os.path.exists(primary_dataset) else legacy_dataset

    print(f"Loading consumption dataset from: {dataset_path}")
    raw_df = pd.read_csv(dataset_path)

    # 1. Feature Engineering
    print("Extracting chronological lag features (t-1, t-2, t-3, 3-mo avg, trend)...")
    features_df = prepare_features(raw_df)
    print(f"Constructed {len(features_df)} feature vectors across {raw_df['household_id'].nunique()} households.")

    # 2. Chronological Train / Test Split
    # Months 4-18: Train (1,500 samples), Months 19-24: Test (600 samples)
    split_threshold = 18
    train_mask = features_df["month_index"] <= split_threshold
    test_mask = features_df["month_index"] > split_threshold

    train_df = features_df[train_mask]
    test_df = features_df[test_mask]

    X_train = train_df[FEATURE_NAMES]
    y_train = train_df[TARGET_NAME]

    X_test = test_df[FEATURE_NAMES]
    y_test = test_df[TARGET_NAME]

    print(f"Training split: {len(X_train)} samples | Testing split: {len(X_test)} samples")

    # 3. Model Training
    print("\nTraining RandomForestRegressor (n_estimators=100, max_depth=10, random_state=42)...")
    rf = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    rf.fit(X_train, y_train)

    # 4. Evaluation
    y_pred_train = rf.predict(X_train)
    y_pred_test = rf.predict(X_test)

    train_mae = mean_absolute_error(y_train, y_pred_train)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
    train_r2 = r2_score(y_train, y_pred_train)

    test_mae = mean_absolute_error(y_test, y_pred_test)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    test_r2 = r2_score(y_test, y_pred_test)

    print("\n" + "-" * 40)
    print("MODEL PERFORMANCE METRICS")
    print("-" * 40)
    print(f"Train Set -> MAE: {train_mae:.2f} L | RMSE: {train_rmse:.2f} L | R2 Score: {train_r2:.4f}")
    print(f"Test Set  -> MAE: {test_mae:.2f} L | RMSE: {test_rmse:.2f} L | R2 Score: {test_r2:.4f}")
    print("-" * 40)

    # Feature importances
    importances = dict(zip(FEATURE_NAMES, [round(float(v), 4) for v in rf.feature_importances_]))
    print("\nFeature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {feat:30s}: {imp * 100:.1f}%")

    # 5. Save Artifacts
    models_dir = os.path.join(base_dir, "models")
    reports_dir = os.path.join(base_dir, "reports")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    model_output_path = os.path.join(models_dir, "random_forest_model.pkl")
    joblib.dump(rf, model_output_path)
    print(f"\nTrained model artifact saved to: {model_output_path}")

    metrics_report = {
        "model_name": "Random Forest Regressor",
        "algorithm": "RandomForestRegressor",
        "model_version": "1.0.0",
        "trained_at": datetime.now().isoformat(),
        "dataset_path": dataset_path,
        "random_state": 42,
        "n_estimators": 100,
        "max_depth": 10,
        "features": FEATURE_NAMES,
        "target": TARGET_NAME,
        "split_strategy": f"Chronological (Train: months 4-{split_threshold}, Test: months {split_threshold+1}-24)",
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "test_mae_litres": round(test_mae, 2),
            "test_rmse_litres": round(test_rmse, 2),
            "test_r2_score": round(test_r2, 4),
            "train_mae_litres": round(train_mae, 2),
            "train_rmse_litres": round(train_rmse, 2),
            "train_r2_score": round(train_r2, 4)
        },
        "feature_importances": importances
    }

    metrics_path = os.path.join(reports_dir, "model_metrics.json")
    with open(metrics_path, "w", encoding="utf-8") as f:
        json.dump(metrics_report, f, indent=2)
    print(f"Evaluation report saved to: {metrics_path}")
    print("=" * 70)


if __name__ == "__main__":
    train_consumption_forecaster()

