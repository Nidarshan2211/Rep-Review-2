"""
AquaTrack - Random Forest Consumption Prediction Engine
Loads models/random_forest_model.pkl and performs validated single-instance predictions.
"""

import os
import joblib
import pandas as pd
from typing import Dict, Any, Tuple

MODEL_FILE = os.path.join(os.path.dirname(__file__), "models", "random_forest_model.pkl")

class WaterConsumptionPredictor:
    def __init__(self, model_path: str = MODEL_FILE):
        self.model_path = model_path
        self.model = None
        self.model_name = "Random Forest Regressor"
        self.model_version = "1.0.0"
        self.load_model()

    def load_model(self):
        if os.path.exists(self.model_path):
            try:
                self.model = joblib.load(self.model_path)
                print(f"[Predictor] Model loaded successfully from: {self.model_path}")
            except Exception as e:
                print(f"[Predictor] Error loading model: {e}")
                self.model = None
        else:
            print(f"[Predictor] Model file does not exist at: {self.model_path}")
            self.model = None

    def is_ready(self) -> bool:
        return self.model is not None

    def predict(self, data: Dict[str, Any]) -> Tuple[float, str]:
        """
        Validates features and predicts next month consumption in litres.
        Returns: (predicted_consumption_litres, status)
        """
        if not self.is_ready():
            raise RuntimeError("Random Forest model is not loaded or unavailable.")

        # Extract features
        prev1 = float(data.get("previous_month_consumption", 0.0))
        prev2 = float(data.get("two_months_ago_consumption", 0.0))
        prev3 = float(data.get("three_months_ago_consumption", 0.0))
        avg3 = float(data.get("three_month_average", (prev1 + prev2 + prev3) / 3.0))
        residents = int(data.get("residents_count", 3))
        month = int(data.get("prediction_month", 1))
        trend = float(data.get("previous_consumption_trend", prev1 - prev3))

        # Input validations
        if prev1 < 0 or prev2 < 0 or prev3 < 0:
            raise ValueError("Historical consumption values cannot be negative.")
        if residents < 1 or residents > 20:
            raise ValueError(f"Residents count must be between 1 and 20. Provided: {residents}")
        if month < 1 or month > 12:
            raise ValueError(f"Prediction month must be between 1 and 12. Provided: {month}")

        feature_vector = pd.DataFrame([{
            "previous_month_consumption": prev1,
            "two_months_ago_consumption": prev2,
            "three_months_ago_consumption": prev3,
            "three_month_average": avg3,
            "residents_count": residents,
            "month_of_year": month,
            "previous_consumption_trend": trend
        }])

        pred_val = float(self.model.predict(feature_vector)[0])
        # Logical guard: consumption cannot be below baseline (~1,500 L/person/month)
        min_allowed = float(residents * 1500.0)
        pred_val = max(pred_val, min_allowed)
        pred_val = round(pred_val, 2)

        return pred_val, "SUCCESS"

# Global singleton predictor instance
predictor = WaterConsumptionPredictor()
