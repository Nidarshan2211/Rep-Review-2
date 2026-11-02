import os
import json
import logging
from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
import joblib
import numpy as np

from app.config import settings
from app.schemas import FlatReadingInput, FlatLeakResult
from app.features import extract_features, FEATURE_NAMES, extract_clean_history
from app.fallback import compute_peer_or_rule_fallback
from app.reasons import generate_leak_reason

logger = logging.getLogger(__name__)


class LeakPredictor:
    def __init__(self, model_dir: Optional[str] = None):
        self.model_dir = Path(model_dir or settings.model_dir)
        self.models = {}
        self.model_info = {}
        self.model_version = "FALLBACK_RULE"
        self.load_models()

    def load_models(self):
        """Loads LightGBM quantile regression models and metadata if present."""
        version_file = self.model_dir / "model_version.json"
        q10_file = self.model_dir / "model_q10.joblib"
        q50_file = self.model_dir / "model_q50.joblib"
        q95_file = self.model_dir / "model_q95.joblib"

        if version_file.exists() and q10_file.exists() and q50_file.exists() and q95_file.exists():
            try:
                with open(version_file, "r", encoding="utf-8") as f:
                    self.model_info = json.load(f)
                self.model_version = self.model_info.get("model_version", "v1.0.0")
                self.models["q10"] = joblib.load(q10_file)
                self.models["q50"] = joblib.load(q50_file)
                self.models["q95"] = joblib.load(q95_file)
                logger.info(f"Loaded ML leak models version '{self.model_version}' from {self.model_dir}")
            except Exception as e:
                logger.error(f"Failed to load ML models from {self.model_dir}: {e}. Falling back to rule engine.", exc_info=True)
                self.models.clear()
                self.model_version = "FALLBACK_RULE"
        else:
            logger.warning(f"ML model files not found in {self.model_dir}. Running in FALLBACK_RULE mode.")
            self.model_version = "FALLBACK_RULE"

    @property
    def is_model_ready(self) -> bool:
        return "q10" in self.models and "q50" in self.models and "q95" in self.models

    def detect_pattern(
        self,
        flat: FlatReadingInput,
        daily_usage: float,
        pred_q95: float,
        clean_history: List[float]
    ) -> str:
        """Determines the usage pattern (SUDDEN_SPIKE, GRADUAL_DRIFT, STEP_CHANGE, VACANT_USAGE, AWAY_USAGE, NONE)."""
        # Vacant
        if flat.occupancy_active is False or (flat.household_size_avg_in_cycle or 1.0) == 0:
            if daily_usage > settings.vacant_threshold_kl_day:
                return "VACANT_USAGE"
            return "NONE"

        # Away usage
        away_days = flat.away_days_in_cycle or 0
        if away_days >= 15 and daily_usage > (pred_q95 * 0.65):
            return "AWAY_USAGE"

        # If not enough history, no temporal pattern
        if len(clean_history) < 2:
            return "NONE"

        lag_1 = clean_history[0]
        # Sudden spike: current >= 1.6x lag_1 and exceeds upper bound
        if lag_1 > 0 and (daily_usage >= 1.6 * lag_1) and (daily_usage > pred_q95):
            return "SUDDEN_SPIKE"

        # Step change: last 2 cycles at least 40% above previous 3
        if len(clean_history) >= 4:
            prev_recent = [daily_usage, clean_history[0]]
            older = clean_history[1:4]
            if np.mean(older) > 0 and np.mean(prev_recent) >= 1.40 * np.mean(older):
                return "STEP_CHANGE"

        # Gradual drift: 3+ cycles rising
        if len(clean_history) >= 3:
            recent_3 = [clean_history[2], clean_history[1], clean_history[0], daily_usage]
            if recent_3[0] < recent_3[1] < recent_3[2] < recent_3[3]:
                return "GRADUAL_DRIFT"

        return "NONE"

    def calculate_risk_score(
        self,
        daily_usage: float,
        pred_q10: float,
        pred_q50: float,
        pred_q95: float
    ) -> float:
        """
        Maps consumption against predicted quantiles to a smooth continuous risk score in [0.0, 1.0].
        """
        if daily_usage <= pred_q50:
            # Below or at median normal: risk between 0.05 and 0.35
            norm_factor = max(0.01, pred_q50)
            ratio = daily_usage / norm_factor
            return float(np.clip(0.05 + 0.30 * ratio, 0.0, 0.35))

        if daily_usage <= pred_q95:
            # Between median (0.35) and 95th percentile upper bound (0.75)
            spread = max(0.01, pred_q95 - pred_q50)
            fraction = (daily_usage - pred_q50) / spread
            return float(np.clip(0.35 + 0.40 * fraction, 0.35, 0.75))

        # Above upper bound: logistic escalation from 0.75 toward 1.0
        spread = max(0.05, pred_q95 - pred_q50)
        z = (daily_usage - pred_q95) / spread
        # Logistic squashing: 0.75 + 0.25 * (1 - exp(-z))
        escalation = 1.0 - np.exp(-max(0.0, z))
        risk = 0.75 + (0.24 * escalation)
        return float(np.clip(risk, 0.75, 0.99))

    def score_flat(self, flat: FlatReadingInput) -> FlatLeakResult:
        days = max(1, flat.days_in_cycle)
        current_kl = float(flat.current_usage_kl) if flat.current_usage_kl is not None else 0.0
        daily_usage = current_kl / float(days)
        hh_size = float(flat.household_size_avg_in_cycle if flat.household_size_avg_in_cycle and flat.household_size_avg_in_cycle > 0 else 1.0)
        peer_avg_kl = (flat.peer_avg_daily_kl * days) if flat.peer_avg_daily_kl else None

        # -------------------------------------------------------------
        # EDGE CASE 1: Meters with apartment_id NULL (common meters)
        # -------------------------------------------------------------
        if flat.apartment_id is None:
            return FlatLeakResult(
                usage_id=flat.usage_id,
                apartment_id=flat.apartment_id,
                expected_min_kl=None,
                expected_kl=None,
                expected_max_kl=None,
                risk_score=0.0,
                status="NOT_APPLICABLE",
                confidence="HIGH",
                pattern="NONE",
                data_quality_flag=None,
                reason="Common-area or unassigned meter. Per-flat residential leak scoring is not applicable."
            )

        # -------------------------------------------------------------
        # EDGE CASE 2: Meter status INACTIVE -> skip scoring
        # -------------------------------------------------------------
        if flat.meter_status and flat.meter_status.upper() == "INACTIVE":
            return FlatLeakResult(
                usage_id=flat.usage_id,
                apartment_id=flat.apartment_id,
                expected_min_kl=None,
                expected_kl=None,
                expected_max_kl=None,
                risk_score=0.0,
                status="NOT_APPLICABLE",
                confidence="HIGH",
                pattern="NONE",
                data_quality_flag=None,
                reason="Meter is marked INACTIVE. Scoring skipped."
            )

        # -------------------------------------------------------------
        # EDGE CASE 3: Data Quality: Null, Negative or Extreme Outlier
        # -------------------------------------------------------------
        if current_kl < 0:
            return FlatLeakResult(
                usage_id=flat.usage_id,
                apartment_id=flat.apartment_id,
                expected_min_kl=None,
                expected_kl=None,
                expected_max_kl=None,
                risk_score=0.0,
                status="DATA_SUSPECT",
                confidence="LOW",
                pattern="NONE",
                data_quality_flag="NEGATIVE_CONSUMPTION",
                reason=f"Recorded consumption is negative ({current_kl:.2f} kL). Data quality check failed."
            )

        # Sanity cap: > 3,000 litres per person per day (3.0 kL/person/day)
        litres_per_person_day = (daily_usage * 1000.0) / max(1.0, hh_size)
        if litres_per_person_day > settings.max_litres_per_person_day:
            clean_hist = extract_clean_history(flat)
            min_d, exp_d, max_d, conf, fallback_status, pattern, _ = compute_peer_or_rule_fallback(flat, clean_hist)
            exp_min_kl = round(min_d * days, 1) if min_d is not None else round(0.10 * hh_size * days, 1)
            exp_kl = round(exp_d * days, 1) if exp_d is not None else round(0.15 * hh_size * days, 1)
            exp_max_kl = round(max_d * days, 1) if max_d is not None else round(0.25 * hh_size * days, 1)

            reason = generate_leak_reason(
                flat, "POTENTIAL_LEAK", "SUDDEN_SPIKE", 0.99, current_kl, exp_min_kl, exp_kl, exp_max_kl, peer_avg_kl
            )
            return FlatLeakResult(
                usage_id=flat.usage_id,
                apartment_id=flat.apartment_id,
                expected_min_kl=exp_min_kl,
                expected_kl=exp_kl,
                expected_max_kl=exp_max_kl,
                risk_score=0.99,
                status="POTENTIAL_LEAK",
                confidence="LOW",
                pattern="SUDDEN_SPIKE",
                data_quality_flag="EXTREME_OUTLIER",
                reason=reason
            )

        # Extract features & clean history
        vec, meta = extract_features(flat)
        clean_history = meta["clean_history"]
        history_count = meta["history_count"]

        # -------------------------------------------------------------
        # EDGE CASE 4: Replaced meter in cycle -> treat as cold start
        # -------------------------------------------------------------
        meter_replaced = bool(flat.meter_recently_replaced)
        meter_faulty = bool(flat.meter_status and flat.meter_status.upper() == "FAULTY")

        # -------------------------------------------------------------
        # Fallback Check: Model unavailable, cold start (< 3 cycles), or meter replaced
        # -------------------------------------------------------------
        if not self.is_model_ready or history_count < 3 or meter_replaced:
            min_d, exp_d, max_d, conf, fallback_status, pattern, reason = compute_peer_or_rule_fallback(
                flat, clean_history if not meter_replaced else []
            )

            exp_min_kl = round(min_d * days, 1) if min_d is not None else None
            exp_kl = round(exp_d * days, 1) if exp_d is not None else None
            exp_max_kl = round(max_d * days, 1) if max_d is not None else None

            # Calculate approx risk score for fallback
            if exp_kl and exp_max_kl:
                risk = self.calculate_risk_score(daily_usage, (min_d or 0), exp_d, exp_max_kl / days)
            else:
                risk = 0.50 if fallback_status == "WATCH" else (0.85 if fallback_status == "POTENTIAL_LEAK" else 0.10)

            if meter_faulty:
                conf = "LOW"
                reason += " Note: Meter is currently marked as FAULTY."
            if meter_replaced:
                conf = "LOW"
                reason += " Note: Meter was recently replaced; establishing new baseline."

            return FlatLeakResult(
                usage_id=flat.usage_id,
                apartment_id=flat.apartment_id,
                expected_min_kl=exp_min_kl,
                expected_kl=exp_kl,
                expected_max_kl=exp_max_kl,
                risk_score=round(risk, 3),
                status=fallback_status,
                confidence=conf,
                pattern=pattern,
                data_quality_flag="MODEL_FALLBACK" if not self.is_model_ready else None,
                reason=reason
            )

        # -------------------------------------------------------------
        # ML Inference: Predict Quantiles
        # -------------------------------------------------------------
        X = vec.reshape(1, -1)
        pred_q10 = float(self.models["q10"].predict(X)[0])
        pred_q50 = float(self.models["q50"].predict(X)[0])
        pred_q95 = float(self.models["q95"].predict(X)[0])

        # Monotonicity adjustment
        pred_q10 = max(0.0, pred_q10)
        pred_q50 = max(pred_q10, pred_q50)
        pred_q95 = max(pred_q50 + 0.02, pred_q95)

        expected_min_kl = round(pred_q10 * days, 1)
        expected_kl = round(pred_q50 * days, 1)
        expected_max_kl = round(pred_q95 * days, 1)

        # -------------------------------------------------------------
        # EDGE CASE 5: Zero or sharply reduced usage in occupied flat
        # -------------------------------------------------------------
        if flat.occupancy_active and (flat.away_days_in_cycle or 0) < 15 and current_kl <= (expected_min_kl * settings.low_usage_ratio_threshold):
            return FlatLeakResult(
                usage_id=flat.usage_id,
                expected_min_kl=expected_min_kl,
                expected_kl=expected_kl,
                expected_max_kl=expected_max_kl,
                risk_score=0.10,
                status="LOW_USAGE_SUSPECT",
                confidence="MEDIUM",
                pattern="NONE",
                data_quality_flag="LOW_USAGE",
                reason=generate_leak_reason(
                    flat, "LOW_USAGE_SUSPECT", "NONE", 0.10, current_kl,
                    expected_min_kl, expected_kl, expected_max_kl, peer_avg_kl
                )
            )

        # -------------------------------------------------------------
        # Risk Score & Pattern Determination
        # -------------------------------------------------------------
        risk_score = self.calculate_risk_score(daily_usage, pred_q10, pred_q50, pred_q95)
        pattern = self.detect_pattern(flat, daily_usage, pred_q95, clean_history)

        # Status Mapping
        if risk_score >= settings.high_risk_threshold:
            status = "HIGH_RISK_LEAK"
        elif risk_score >= settings.potential_leak_threshold:
            status = "POTENTIAL_LEAK"
        elif risk_score >= settings.watch_threshold:
            status = "WATCH"
        else:
            status = "NORMAL"

        # Determine Confidence
        if meter_faulty or flat.recent_move_in or (not flat.household_size_confirmed and flat.household_size_source == "DEFAULT_ESTIMATE"):
            confidence = "LOW"
        elif history_count >= 5 and flat.household_size_confirmed:
            confidence = "HIGH"
        else:
            confidence = "MEDIUM"

        # Safe Guard: Never flag HIGH_RISK_LEAK on LOW confidence alone
        if confidence == "LOW" and status == "HIGH_RISK_LEAK":
            status = "POTENTIAL_LEAK"
            risk_score = min(0.92, risk_score)

        # Physical minimum consumption guard: don't flag leaks on trivial tiny usages
        if current_kl <= 8.0 and status in ("POTENTIAL_LEAK", "HIGH_RISK_LEAK"):
            status = "WATCH"
            risk_score = min(0.65, risk_score)

        reason = generate_leak_reason(
            flat, status, pattern, risk_score, current_kl,
            expected_min_kl, expected_kl, expected_max_kl, peer_avg_kl
        )

        return FlatLeakResult(
            usage_id=flat.usage_id,
            apartment_id=flat.apartment_id,
            expected_min_kl=expected_min_kl,
            expected_kl=expected_kl,
            expected_max_kl=expected_max_kl,
            risk_score=round(risk_score, 3),
            status=status,
            confidence=confidence,
            pattern=pattern,
            data_quality_flag=None,
            reason=reason
        )

    def score_batch(self, flats: List[FlatReadingInput]) -> List[FlatLeakResult]:
        return [self.score_flat(flat) for flat in flats]
