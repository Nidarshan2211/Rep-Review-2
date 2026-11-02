"""
AquaFlow / AquaTrack - Unified ML Model Training Suite
Usage:
    python train_model.py                   # Trains both models by default
    python train_model.py --model forecasting # Trains Random Forest Consumption Forecaster
    python train_model.py --model leak      # Trains LightGBM Quantile Leak Detector
    python train_model.py --model all       # Trains both models
"""

import sys
import argparse
from pathlib import Path

# Add current directory to path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from training.train_consumption_forecaster import train_consumption_forecaster
from training.train_leak_detector import train_leak_detector


def main():
    parser = argparse.ArgumentParser(description="AquaFlow Unified Machine Learning Training Suite")
    parser.add_argument(
        "--model",
        choices=["forecasting", "leak", "all"],
        default="all",
        help="Specify which model to train: 'forecasting' (Random Forest), 'leak' (LightGBM Quantile), or 'all' (default)"
    )
    args = parser.parse_args()

    print("\n" + "=" * 75)
    print("       AQUAFLOW / AQUATRACK UNIFIED MACHINE LEARNING TRAINING SUITE")
    print("=" * 75)

    if args.model in ("forecasting", "all"):
        print("\n>>> [1/2] Initiating Household Next-Month Consumption Forecaster...")
        train_consumption_forecaster()

    if args.model in ("leak", "all"):
        print("\n>>> [2/2] Initiating Multi-Flat Quantile Leak Detector...")
        train_leak_detector()

    print("\n" + "=" * 75)
    print("   ALL MODEL TRAINING PIPELINES COMPLETED SUCCESSFULLY!")
    print("   Artifacts are persisted in 'models/' and ready for FastAPI inference.")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    main()
