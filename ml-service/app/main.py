"""
AquaFlow - FastAPI Application Mount
Re-exports the unified FastAPI application from root main.py for full backward compatibility
with commands like 'uvicorn app.main:app'.
"""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Import unified app from main.py
from main import app, get_leak_predictor

__all__ = ["app", "get_leak_predictor"]
