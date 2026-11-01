"""
AquaTrack - Random Forest Model Training Script
Trains RandomForestRegressor on synthetic water consumption dataset.
Uses chronological split to evaluate MAE, RMSE, and R2 score.
Saves model binary to models/random_forest_model.pkl and metrics to reports/model_metrics.json.
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

def prepare_features(df):
    """
    Transforms raw sequential monthly consumption records into chronological
    lagged feature vectors per household without data leakage.
    """
    feature_rows = []

    for h_id, group in df.groupby("household_id"):
        # Ensure chronological order by month_index
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

def train_and_evaluate():
    print("=" * 65)
    print("AQUATRACK RANDOM FOREST PREDICTION MODEL TRAINING")
    print("=" * 65)

    base_dir = os.path.dirname(__file__)
    dataset_path = os.path.join(base_dir, "dataset", "synthetic_water_usage.csv")

    if not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Synthetic dataset not found at: {dataset_path}. Run generate_dataset.py first.")

    print(f"Loading dataset from: {dataset_path}")
    raw_df = pd.read_csv(dataset_path)

    # 1. Feature Engineering
    print("Extracting chronological lag features...")
    features_df = prepare_features(raw_df)
    print(f"Constructed {len(features_df)} feature vectors across {raw_df['household_id'].nunique()} households.")

    # 2. Chronological Train / Test Split
    # Months 4 through 18 -> Train (15 months x 100 = 1500 samples)
    # Months 19 through 24 -> Test (6 months x 100 = 600 samples)
    split_threshold = 18
    train_mask = features_df["month_index"] <= split_threshold
    test_mask = features_df["month_index"] > split_threshold

    train_df = features_df[train_mask]
    test_df = features_df[test_mask]

    X_train = train_df[FEATURE_NAMES]
    y_train = train_df[TARGET_NAME]
    X_test = test_df[FEATURE_NAMES]
    y_test = test_df[TARGET_NAME]

    print(f"Train samples: {len(X_train)} (month indices 4 to {split_threshold})")
    print(f"Test samples:  {len(X_test)} (month indices {split_threshold + 1} to 24)")

    # 3. Model Training (Strictly RandomForestRegressor)
    print("\nTraining RandomForestRegressor (n_estimators=100, max_depth=10, random_state=42)...")
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    # 4. Evaluation
    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    train_mae = mean_absolute_error(y_train, y_pred_train)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
    train_r2 = r2_score(y_train, y_pred_train)

    test_mae = mean_absolute_error(y_test, y_pred_test)
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    test_r2 = r2_score(y_test, y_pred_test)

    print("\n--- Training Set Performance ---")
    print(f"MAE:  {train_mae:.2f} Litres")
    print(f"RMSE: {train_rmse:.2f} Litres")
    print(f"R²:   {train_r2:.4f}")

    print("\n--- Out-of-Time Test Set Performance ---")
    print(f"MAE:  {test_mae:.2f} Litres")
    print(f"RMSE: {test_rmse:.2f} Litres")
    print(f"R²:   {test_r2:.4f}")

    # Feature Importances
    importances = dict(zip(FEATURE_NAMES, [round(float(v), 4) for v in model.feature_importances_]))
    print("\nFeature Importances:")
    for feat, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        print(f"  - {feat:30s}: {imp:.4f}")

    # 5. Persist Model & Metrics
    models_dir = os.path.join(base_dir, "models")
    reports_dir = os.path.join(base_dir, "reports")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    model_output_path = os.path.join(models_dir, "random_forest_model.pkl")
    joblib.dump(model, model_output_path)
    print(f"\nModel saved successfully to: {model_output_path}")

    metrics_payload = {
        "model_name": "Random Forest Regressor",
        "algorithm": "RandomForestRegressor",
        "model_version": "1.0.0",
        "trained_at": datetime.now().isoformat(),
        "dataset_type": "Synthetic Water Consumption (ml-service/dataset/synthetic_water_usage.csv)",
        "random_state": 42,
        "n_estimators": 100,
        "max_depth": 10,
        "features": FEATURE_NAMES,
        "target": TARGET_NAME,
        "split_strategy": "Chronological (Train: months 4-18, Test: months 19-24)",
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "metrics": {
            "test_mae_litres": round(float(test_mae), 2),
            "test_rmse_litres": round(float(test_rmse), 2),
            "test_r2_score": round(float(test_r2), 4),
            "train_mae_litres": round(float(train_mae), 2),
            "train_rmse_litres": round(float(train_rmse), 2),
            "train_r2_score": round(float(train_r2), 4)
        },
        "feature_importances": importances
    }

    metrics_output_path = os.path.join(reports_dir, "model_metrics.json")
    with open(metrics_output_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)
    print(f"Model metrics saved to: {metrics_output_path}")
    print("=" * 65)

    return model, metrics_payload

if __name__ == "__main__":
    train_and_evaluate()
