"""
AquaTrack - Synthetic Water Consumption Dataset Generator
Generates realistic monthly consumption records for 100 synthetic households over 24 months.
Saves to ml-service/data/consumption_forecasting/synthetic_water_usage.csv.
"""

import os
import numpy as np
import pandas as pd


def generate_consumption_dataset():
    np.random.seed(42)

    num_households = 100
    num_months = 24  # 2 full calendar years

    records = []

    # Seasonal factors for 12 calendar months (1=Jan, 12=Dec)
    # Peak summer in April-July, lowest in Dec-Feb
    seasonal_factors = {
        1: 0.90,  # Jan (winter)
        2: 0.92,  # Feb
        3: 0.98,  # Mar
        4: 1.18,  # Apr (summer onset)
        5: 1.25,  # May (peak heat)
        6: 1.20,  # Jun
        7: 1.12,  # Jul
        8: 1.02,  # Aug (monsoon)
        9: 1.00,  # Sep
        10: 1.04, # Oct
        11: 0.96, # Nov
        12: 0.88  # Dec (winter)
    }

    # Generate household profiles
    household_profiles = {}
    for h_idx in range(num_households):
        household_id = 1001 + h_idx
        residents_count = int(np.random.choice([1, 2, 3, 4, 5, 6], p=[0.10, 0.25, 0.30, 0.20, 0.10, 0.05]))
        per_capita_base = np.random.uniform(4200, 5200)
        household_base = residents_count * per_capita_base + np.random.uniform(1500, 3000)
        efficiency_factor = np.random.uniform(0.85, 1.15)

        household_profiles[household_id] = {
            "residents_count": residents_count,
            "household_base": household_base,
            "efficiency_factor": efficiency_factor
        }

    # Generate chronological monthly observations
    for h_id, profile in household_profiles.items():
        base = profile["household_base"] * profile["efficiency_factor"]
        residents = profile["residents_count"]

        for month_idx in range(1, num_months + 1):
            month_of_year = ((month_idx - 1) % 12) + 1
            seasonal = seasonal_factors[month_of_year]
            monthly_noise = np.random.normal(1.0, 0.05)

            is_abnormal = 0
            abnormal_multiplier = 1.0
            rand_val = np.random.rand()
            if rand_val < 0.03:
                is_abnormal = 1
                abnormal_multiplier = np.random.uniform(1.30, 1.55)
            elif rand_val < 0.05:
                is_abnormal = 1
                abnormal_multiplier = np.random.uniform(1.65, 2.10)

            consumption = base * seasonal * monthly_noise * abnormal_multiplier
            consumption = max(consumption, residents * 2000.0)
            consumption = round(consumption, 2)

            records.append({
                "household_id": h_id,
                "month_index": month_idx,
                "month_of_year": month_of_year,
                "residents_count": residents,
                "consumption_litres": consumption,
                "seasonal_factor": round(seasonal, 2),
                "abnormal_usage": is_abnormal
            })

    df = pd.DataFrame(records)
    df.sort_values(by=["household_id", "month_index"], inplace=True)
    df.reset_index(drop=True, inplace=True)

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    primary_dir = os.path.join(base_dir, "data", "consumption_forecasting")
    legacy_dir = os.path.join(base_dir, "dataset")

    os.makedirs(primary_dir, exist_ok=True)
    os.makedirs(legacy_dir, exist_ok=True)

    primary_path = os.path.join(primary_dir, "synthetic_water_usage.csv")
    legacy_path = os.path.join(legacy_dir, "synthetic_water_usage.csv")

    df.to_csv(primary_path, index=False)
    df.to_csv(legacy_path, index=False)

    print(f"Generated {len(df)} records for {num_households} households across {num_months} months.")
    print(f"Saved to: {primary_path}")
    print(f"Legacy backup saved to: {legacy_path}")
    return df


if __name__ == "__main__":
    generate_consumption_dataset()

