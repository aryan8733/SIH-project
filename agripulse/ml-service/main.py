"""
AgriPulse ML service.

Endpoints
    GET  /health
    POST /predict        7-day price forecast for one crop in one market
    POST /predict/batch  same, for several series at once

The Node backend calls /predict and falls back to its own JS regression if this
service is not running, so the platform never goes down because of the model.

Run:  uvicorn main:app --reload --port 8000
"""
from datetime import date, timedelta
from typing import List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from predict import forecast_series

app = FastAPI(title="AgriPulse ML Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class PredictRequest(BaseModel):
    crop: str
    market: Optional[str] = None
    series: List[float] = Field(..., min_length=8, description="Daily modal prices, oldest first")
    demand: str = "Medium"
    days: int = 7


class PredictResponse(BaseModel):
    engine: str
    days: int
    currentPrice: float
    predictedPrice: float
    lowerBound: float
    upperBound: float
    slopePerDay: float
    r2: float
    direction: str
    changePct: float
    dailyPath: List[dict]
    disclaimer: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "agripulse-ml", "version": "1.0.0"}


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    result = forecast_series(req.series, demand=req.demand, days=req.days)

    start = date.today()
    result["dailyPath"] = [
        {
            "date": (start + timedelta(days=i + 1)).isoformat(),
            "price": round(
                result["currentPrice"]
                + (result["predictedPrice"] - result["currentPrice"]) * (i + 1) / req.days,
                2,
            ),
        }
        for i in range(req.days)
    ]
    result["disclaimer"] = (
        "Prediction is an estimate based on available data and should not be "
        "treated as a guaranteed future price."
    )
    return result


@app.post("/predict/batch")
def predict_batch(items: List[PredictRequest]):
    return [
        {"crop": it.crop, "market": it.market, **forecast_series(it.series, it.demand, it.days)}
        for it in items
    ]
