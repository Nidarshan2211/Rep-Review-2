"""
AquaFlow - Multi-Flat Leak Detection Benchmark Dataset Generator
Generates 16 flats across 18 billing cycles (2025-01 to 2026-06) with realistic baseline variations,
seasonal heat factors, vacations/away periods, move-ins, and injected leak scenarios.
Saves to ml-service/data/leak_detection/synthetic/ (and legacy data/synthetic/).
"""

import sys
from pathlib import Path

# Add root directory to path
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from training.generate_synthetic_data import generate_synthetic_dataset


def generate_leak_dataset():
    print("=" * 70)
    print("AQUAFLOW - GENERATING MULTI-FLAT LEAK DETECTION BENCHMARK DATASET")
    print("=" * 70)
    records = generate_synthetic_dataset()

    # Also mirror into organized data folder
    import json
    import pandas as pd

    org_dir = BASE_DIR / "data" / "leak_detection" / "synthetic"
    org_dir.mkdir(parents=True, exist_ok=True)

    with open(org_dir / "synthetic_water_usage.json", "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2)

    df = pd.DataFrame(records)
    df.to_csv(org_dir / "synthetic_water_usage.csv", index=False)

    print(f"Organized copies saved to: {org_dir}")
    print("=" * 70)
    return records


if __name__ == "__main__":
    generate_leak_dataset()

