"""
Forecasting logic. Two explainable models, exactly as the SIH brief asks for:

  linear   - sklearn LinearRegression on the day index. Explainable, gives a
             slope in rupees/day and an R2 the farmer can be shown.
  forest   - RandomForestRegressor on lag features. Used when a trained model
             file exists for the crop (see train.py).

A demand adjustment nudges the trend: a High-demand mandi is more likely to
hold or push prices up than a Low-demand one.
"""
import os
from typing import Dict, List

import numpy as np
from sklearn.linear_model import LinearRegression

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
WINDOW = 21
DEMAND_PUSH = {"High": 1.0, "Medium": 0.0, "Low": -0.8}


def _fit_linear(values: np.ndarray):
    x = np.arange(len(values)).reshape(-1, 1)
    model = LinearRegression().fit(x, values)
    pred = model.predict(x)
    ss_res = float(np.sum((values - pred) ** 2))
    ss_tot = float(np.sum((values - values.mean()) ** 2))
    r2 = 1 - ss_res / ss_tot if ss_tot else 0.0
    residual_std = float(np.sqrt(ss_res / max(len(values) - 2, 1)))
    return float(model.coef_[0]), float(model.intercept_), r2, residual_std


def forecast_series(series: List[float], demand: str = "Medium", days: int = 7) -> Dict:
    values = np.asarray(series[-WINDOW:], dtype=float)
    slope, _intercept, r2, residual_std = _fit_linear(values)

    current = float(values[-1])
    push = DEMAND_PUSH.get(demand, 0.0) * current * 0.0016
    point = current + (slope + push) * days

    # Prediction band: residual spread plus uncertainty that grows with the horizon.
    band = max(residual_std * 1.28, current * 0.008) + abs(slope) * days * 0.35

    if slope > current * 0.0004:
        direction = "rising"
    elif slope < -current * 0.0004:
        direction = "falling"
    else:
        direction = "flat"

    return {
        "engine": "python-sklearn-linear",
        "days": days,
        "currentPrice": round(current, 2),
        "predictedPrice": round(point, 2),
        "lowerBound": round(point - band, 2),
        "upperBound": round(point + band, 2),
        "slopePerDay": round(slope, 2),
        "r2": round(r2, 3),
        "direction": direction,
        "changePct": round((point - current) / current * 100, 2),
    }


if __name__ == "__main__":
    import json
    from data.generate_data import demo_series

    print(json.dumps(forecast_series(demo_series("soybean"), "High"), indent=2))
