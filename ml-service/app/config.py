import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if present
env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)


class Settings:
    def __init__(self):
        self.ml_api_key: str = os.getenv("ML_API_KEY", "test-ml-secret-key-aqua-flow-2026")
        self.port: int = int(os.getenv("PORT", "8000"))
        self.host: str = os.getenv("HOST", "0.0.0.0")
        self.model_dir: str = os.getenv("MODEL_DIR", "models")
        self.log_level: str = os.getenv("LOG_LEVEL", "INFO")
        self.schema_version: int = int(os.getenv("SCHEMA_VERSION", "1"))

        # Business thresholds
        self.vacant_threshold_kl_day: float = float(os.getenv("VACANT_THRESHOLD_KL_DAY", "0.05"))
        self.max_litres_per_person_day: float = float(os.getenv("MAX_LITRES_PER_PERSON_DAY", "3000.0"))
        self.low_usage_ratio_threshold: float = float(os.getenv("LOW_USAGE_RATIO_THRESHOLD", "0.20"))

        # Risk score mapping thresholds
        self.watch_threshold: float = float(os.getenv("WATCH_THRESHOLD", "0.50"))
        self.potential_leak_threshold: float = float(os.getenv("POTENTIAL_LEAK_THRESHOLD", "0.80"))
        self.high_risk_threshold: float = float(os.getenv("HIGH_RISK_THRESHOLD", "0.95"))


settings = Settings()
