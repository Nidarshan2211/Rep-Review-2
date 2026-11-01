"""
AquaTrack - Synthetic Water Consumption Dataset Generator
Generates realistic monthly consumption records for 100 synthetic households over 24 months.
Strictly isolated in ml-service/dataset/synthetic_water_usage.csv.
"""

import os
import numpy as np
import pandas as pd

def generate_synthetic_water_dataset():
    np.random.seed(42)

    num_households = 100
    num_months = 24  # 2 full years

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
        household_id = 1001 + h_idx  # 1001 to 1100 (distinguishable from real IDs)
        # Residents count: 1 to 6 with realistic distribution
        residents_count = int(np.random.choice([1, 2, 3, 4, 5, 6], p=[0.10, 0.25, 0.30, 0.20, 0.10, 0.05]))
        # Base consumption per person per month (litres): ~4,200 to 5,200 L (~140 to 175 L/day/person)
        per_capita_base = np.random.uniform(4200, 5200)
        # Household baseline = residents * per_capita_base + small appliance/cleaning fixed base
        household_base = residents_count * per_capita_base + np.random.uniform(1500, 3000)
        # Personal conservation index (some households naturally save, others consume more)
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

            # Natural monthly variation: normal distribution with mean 1.0, std 0.05
            monthly_noise = np.random.normal(1.0, 0.05)

            # Check for simulated abnormal usage (e.g. guests, leaks, garden filling) ~ 5% probability
            is_abnormal = 0
            abnormal_multiplier = 1.0
            rand_val = np.random.rand()
            if rand_val < 0.03:
                # Moderate spike (guests/parties)
                is_abnormal = 1
                abnormal_multiplier = np.random.uniform(1.30, 1.55)
            elif rand_val < 0.05:
                # Severe spike (plumbing leak / running toilet valve)
                is_abnormal = 1
                abnormal_multiplier = np.random.uniform(1.65, 2.10)

            # Compute consumption in litres
            consumption = base * seasonal * monthly_noise * abnormal_multiplier
            # Ensure non-negative and realistic minimum
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

    # Sort strictly by household_id and month_index
    df.sort_values(by=["household_id", "month_index"], inplace=True)
    df.reset_index(drop=True, inplace=True)

    # Save to ml-service/dataset/
    dataset_dir = os.path.join(os.path.dirname(__file__), "dataset")
    os.makedirs(dataset_dir, exist_ok=True)
    output_path = os.path.join(dataset_dir, "synthetic_water_usage.csv")

    df.to_csv(output_path, index=False)
    print(f"Generated synthetic dataset with {len(df)} records for {num_households} households over {num_months} months.")
    print(f"Saved dataset to: {output_path}")

    # Dataset summary
    print("\nDataset Summary Statistics:")
    print(df[["residents_count", "consumption_litres", "seasonal_factor", "abnormal_usage"]].describe())

    return output_path

if __name__ == "__main__":
    generate_synthetic_water_dataset()
