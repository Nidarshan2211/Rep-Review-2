"""
AquaFlow / AquaTrack - Unified Synthetic Dataset Generator
Usage:
    python generate_dataset.py                   # Generates both benchmark datasets
    python generate_dataset.py --dataset forecasting # Generates 24-month consumption dataset
    python generate_dataset.py --dataset leak    # Generates 18-cycle multi-flat leak dataset
"""

import sys
import argparse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from training.generate_consumption_data import generate_consumption_dataset
from training.generate_leak_data import generate_leak_dataset

# Keep backward-compatible function name for legacy imports
generate_synthetic_water_dataset = generate_consumption_dataset


def main():
    parser = argparse.ArgumentParser(description="AquaFlow Unified Benchmark Dataset Generator")
    parser.add_argument(
        "--dataset",
        choices=["forecasting", "leak", "all"],
        default="all",
        help="Specify which dataset to generate: 'forecasting', 'leak', or 'all' (default)"
    )
    args = parser.parse_args()

    print("\n" + "=" * 75)
    print("       AQUAFLOW / AQUATRACK BENCHMARK DATASET GENERATOR")
    print("=" * 75)

    if args.dataset in ("forecasting", "all"):
        print("\n>>> [1/2] Generating Household Next-Month Consumption Dataset...")
        generate_consumption_dataset()

    if args.dataset in ("leak", "all"):
        print("\n>>> [2/2] Generating Multi-Flat Leak Detection Benchmark Dataset...")
        generate_leak_dataset()

    print("\n" + "=" * 75)
    print("   ALL BENCHMARK DATASETS GENERATED SUCCESSFULLY!")
    print("   Data saved in 'data/' and mirrored in legacy paths for full compatibility.")
    print("=" * 75 + "\n")


if __name__ == "__main__":
    main()
