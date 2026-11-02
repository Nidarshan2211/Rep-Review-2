from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator


class FlatReadingInput(BaseModel):
    usage_id: int
    apartment_id: Optional[int] = None
    apartment_number: Optional[str] = None
    unit_type: Optional[str] = "2BHK"
    floor_number: Optional[int] = 1
    month: int = Field(default=1, ge=1, le=12)
    year: int = Field(default=2026, ge=2020, le=2100)
    days_in_cycle: int = Field(default=30)
    current_usage_kl: float

    # Past cycle historical arrays
    past_usage_kl: List[float] = Field(default_factory=list)
    past_days_in_cycle: List[int] = Field(default_factory=list)
    past_household_size_avg: List[float] = Field(default_factory=list)
    past_incident_flags: List[bool] = Field(default_factory=list)

    # Household size features
    household_size_avg_in_cycle: Optional[float] = 1.0
    household_size_at_cycle_end: Optional[int] = 1
    household_changed_in_cycle: Optional[bool] = False
    household_size_source: Optional[str] = "DEFAULT_ESTIMATE"
    household_size_confirmed: Optional[bool] = False

    # Occupancy & Away
    away_days_in_cycle: Optional[int] = 0
    occupied_days_in_cycle: Optional[int] = None
    occupancy_active: Optional[bool] = True
    recent_move_in: Optional[bool] = False

    # Meter metadata
    meter_status: Optional[str] = "ACTIVE"
    meter_recently_replaced: Optional[bool] = False

    # Aggregates / peers
    peer_avg_daily_kl: Optional[float] = None
    peer_count: Optional[int] = 0
    building_avg_daily_kl: Optional[float] = None
    building_avg_daily_kl_per_person: Optional[float] = None

    @model_validator(mode='before')
    @classmethod
    def normalize_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map Spring Boot field names if present
            if 'current_usage_kl' not in data and 'units_consumed' in data:
                data['current_usage_kl'] = float(data['units_consumed'] or 0.0)
            if 'month' not in data and 'billing_month' in data:
                data['month'] = int(data['billing_month'] or 1)
            if 'year' not in data and 'billing_year' in data:
                data['year'] = int(data['billing_year'] or 2026)
            if 'days_in_cycle' not in data and 'cycle_days' in data:
                data['days_in_cycle'] = int(data['cycle_days'] or 30)
            if 'past_usage_kl' not in data and 'historical_units' in data:
                data['past_usage_kl'] = [float(x) for x in (data['historical_units'] or []) if x is not None]
            if 'household_size_avg_in_cycle' not in data and 'household_size' in data:
                data['household_size_avg_in_cycle'] = float(data['household_size'] or 1.0)
                data['household_size_at_cycle_end'] = int(data['household_size'] or 1)
            if 'peer_avg_daily_kl' not in data and 'peer_median_units' in data and data['peer_median_units'] is not None:
                days = data.get('days_in_cycle') or data.get('cycle_days') or 30
                data['peer_avg_daily_kl'] = float(data['peer_median_units']) / float(days)
        return data


class LeakScoreBatchRequest(BaseModel):
    schema_version: int = 1
    billing_cycle_id: Optional[int] = None
    building_id: Optional[int] = None
    flats: List[FlatReadingInput] = Field(..., max_length=500)

    @model_validator(mode='before')
    @classmethod
    def normalize_request(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Accept 'items' (from Spring Boot) or 'flats'
            if 'flats' not in data and 'items' in data:
                data['flats'] = data['items']
            if 'billing_cycle_id' not in data and 'cycle_id' in data:
                cid = str(data['cycle_id']).replace('CYC-', '').strip()
                try:
                    data['billing_cycle_id'] = int(cid)
                except ValueError:
                    data['billing_cycle_id'] = None
        return data


class FlatLeakResult(BaseModel):
    usage_id: int
    apartment_id: Optional[int] = None

    # Primary fields
    expected_min_kl: Optional[float] = None
    expected_kl: Optional[float] = None
    expected_max_kl: Optional[float] = None
    risk_score: float
    status: str
    confidence: str
    pattern: str
    data_quality_flag: Optional[str] = None
    reason: str

    # Spring Boot dual-compatibility aliases
    anomaly_status: Optional[str] = None
    anomaly_score: Optional[float] = None
    expected_min: Optional[float] = None
    expected_max: Optional[float] = None
    anomaly_reason: Optional[str] = None
    anomaly_confidence: Optional[str] = None
    anomaly_pattern: Optional[str] = None
    model_version: Optional[str] = None

    @model_validator(mode='before')
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if 'anomaly_status' not in data or data['anomaly_status'] is None:
                data['anomaly_status'] = data.get('status')
            if 'anomaly_score' not in data or data['anomaly_score'] is None:
                data['anomaly_score'] = data.get('risk_score')
            if 'expected_min' not in data or data['expected_min'] is None:
                data['expected_min'] = data.get('expected_min_kl')
            if 'expected_max' not in data or data['expected_max'] is None:
                data['expected_max'] = data.get('expected_max_kl')
            if 'anomaly_reason' not in data or data['anomaly_reason'] is None:
                data['anomaly_reason'] = data.get('reason')
            if 'anomaly_confidence' not in data or data['anomaly_confidence'] is None:
                data['anomaly_confidence'] = data.get('confidence')
            if 'anomaly_pattern' not in data or data['anomaly_pattern'] is None:
                data['anomaly_pattern'] = data.get('pattern')
        return data


class LeakScoreBatchResponse(BaseModel):
    cycle_id: Optional[str] = None
    model_version: str
    scored_at: Optional[str] = None
    results: List[FlatLeakResult]


class HealthResponse(BaseModel):
    status: str
    model_version: str
    schema_version: int


class ModelInfoResponse(BaseModel):
    model_version: str
    schema_version: int
    training_date: str
    metrics: Dict[str, Any]
    feature_list: List[str]
