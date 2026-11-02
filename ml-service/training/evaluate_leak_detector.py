"""
AquaFlow - LightGBM Quantile Leak Detector Evaluation & Benchmark
Compares the Quantile Gradient Boosting model against:
  1. The legacy statistical Mean + 2*SD rule.
  2. An ablated model without household size features.
Calculates Precision, Recall, F1-Score, and Detection Delay across all test cycles.
"""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from training.evaluate_model import evaluate


def evaluate_leak_detector():
    print("=" * 70)
    print("AQUAFLOW - LEAK DETECTOR BENCHMARK & EVALUATION")
    print("=" * 70)
    evaluate()


if __name__ == "__main__":
    evaluate_leak_detector()

