"""
AgriPulse core decision engine, pure Python.

This mirrors backend/services/*.js exactly (same formulas) so the Streamlit
demo and the Node/Mongo stack always agree. No external services needed —
everything here runs in-process, which is what makes it deployable on
Streamlit Community Cloud with zero infrastructure.
"""
from __future__ import annotations
import math
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Dict, List, Optional

# ---------------------------------------------------------------- constants
VEHICLES = {
    "tractor": {"label": "Tractor trolley", "capacity": 12, "mult": 0.8},
    "pickup":  {"label": "Pickup / Chhota hathi", "capacity": 25, "mult": 1.0},
    "truck":   {"label": "6-tyre truck", "capacity": 90, "mult": 1.6},
}
GRADE_FACTOR = {"A": 1.0, "B": 0.955, "C": 0.90}
STORAGE_PER_QTL_PER_DAY = 4
DEMAND_SCORE = {"High": 1.0, "Medium": 0.6, "Low": 0.25}
DEMAND_PUSH = {"High": 1.0, "Medium": 0.0, "Low": -0.8}
GRADE_RANK = {"A": 3, "B": 2, "C": 1}

CROPS = [
    {"code": "soybean", "en": "Soybean", "hi": "सोयाबीन", "mr": "सोयाबीन", "msp": 4892},
    {"code": "wheat",   "en": "Wheat",   "hi": "गेहूँ",   "mr": "गहू",     "msp": 2425},
    {"code": "onion",   "en": "Onion",   "hi": "प्याज",   "mr": "कांदा",   "msp": None},
    {"code": "tomato",  "en": "Tomato",  "hi": "टमाटर",  "mr": "टोमॅटो",  "msp": None},
    {"code": "cotton",  "en": "Cotton",  "hi": "कपास",   "mr": "कापूस",   "msp": 7521},
]
CROP_BY_CODE = {c["code"]: c for c in CROPS}


def suggest_vehicle(qty: float) -> str:
    if qty <= VEHICLES["tractor"]["capacity"]:
        return "tractor"
    if qty <= VEHICLES["pickup"]["capacity"]:
        return "pickup"
    return "truck"


@dataclass
class Settings:
    transport_rate_per_km: float = 25
    charge_return_trip: bool = True
    mandi_fee_pct: float = 1.5
    commission_pct: float = 1.0
    labour_per_qtl: float = 22
    packing_per_qtl: float = 18
    platform_fee_pct: float = 1.0


# ---------------------------------------------------------------- transport
def transport_cost(distance_km: float, qty: float, vehicle: str, settings: Settings) -> Dict:
    v = VEHICLES.get(vehicle, VEHICLES["pickup"])
    trips = max(1, math.ceil(qty / v["capacity"]))
    billed_km = distance_km * 2 if settings.charge_return_trip else distance_km
    total = billed_km * settings.transport_rate_per_km * v["mult"] * trips
    return {
        "vehicle": vehicle, "label": v["label"], "trips": trips,
        "distance_km": distance_km, "billed_km": billed_km,
        "total": round(total), "per_qtl": round(total / max(qty, 1)),
    }


# ---------------------------------------------------------------- ledger
def net_return(modal_price: float, qty: float, quality: str, distance_km: float,
               vehicle: str, settings: Settings) -> Dict:
    """Net return = revenue - transport - mandi fee - commission - labour - packing."""
    grade_factor = GRADE_FACTOR.get(quality, 1.0)
    effective_price = modal_price * grade_factor
    revenue = effective_price * qty

    tr = transport_cost(distance_km, qty, vehicle, settings)
    mandi_fee = revenue * settings.mandi_fee_pct / 100
    commission = revenue * settings.commission_pct / 100
    labour = settings.labour_per_qtl * qty
    packing = settings.packing_per_qtl * qty

    total_cost = tr["total"] + mandi_fee + commission + labour + packing
    net = revenue - total_cost

    return {
        "modal_price": round(modal_price), "grade_factor": grade_factor,
        "effective_price": round(effective_price), "revenue": round(revenue),
        "transport": tr, "mandi_fee": round(mandi_fee), "commission": round(commission),
        "labour": round(labour), "packing": round(packing),
        "total_cost": round(total_cost), "net": round(net),
        "net_per_qtl": round(net / max(qty, 1)),
    }


# ---------------------------------------------------------------- forecast
def linear_regression(values: List[float]) -> Dict:
    n = len(values)
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    num = sum((xs[i] - mean_x) * (values[i] - mean_y) for i in range(n))
    den = sum((xs[i] - mean_x) ** 2 for i in range(n))
    slope = num / den if den else 0
    intercept = mean_y - slope * mean_x
    ss_res = sum((values[i] - (intercept + slope * xs[i])) ** 2 for i in range(n))
    ss_tot = sum((v - mean_y) ** 2 for v in values)
    r2 = 1 - ss_res / ss_tot if ss_tot else 0
    residual_std = math.sqrt(ss_res / max(n - 2, 1))
    return {"slope": slope, "intercept": intercept, "r2": r2, "residual_std": residual_std}


def forecast(series: List[float], demand: str = "Medium", days: int = 7) -> Dict:
    window = series[-21:]
    reg = linear_regression(window)
    current = window[-1]
    push = DEMAND_PUSH.get(demand, 0) * current * 0.0016
    point = current + (reg["slope"] + push) * days
    band = max(reg["residual_std"] * 1.28, current * 0.008) + abs(reg["slope"]) * days * 0.35

    direction = "rising" if reg["slope"] > current * 0.0004 else \
                "falling" if reg["slope"] < -current * 0.0004 else "flat"

    return {
        "current": current, "point": point, "lo": point - band, "hi": point + band,
        "slope": reg["slope"], "r2": reg["r2"], "days": days, "direction": direction,
        "change_pct": (point - current) / current * 100,
    }


# ---------------------------------------------------------------- sell now vs wait
def sell_now_or_wait(fc: Dict, qty: float, quality: str, distance_km: float,
                      vehicle: str, settings: Settings) -> Dict:
    now = net_return(fc["current"], qty, quality, distance_km, vehicle, settings)
    later = net_return(fc["point"], qty, quality, distance_km, vehicle, settings)
    gain = later["net"] - now["net"]
    storage_cost = round(STORAGE_PER_QTL_PER_DAY * qty * fc["days"])
    net_gain = gain - storage_cost

    if net_gain > qty * 30 and fc["direction"] == "rising":
        verdict = "wait"
        reason = (f"Prices are trending up. Holding {fc['days']} days is worth about "
                  f"Rs {gain:,.0f}; after Rs {storage_cost:,.0f} storage you are still "
                  f"Rs {net_gain:,.0f} ahead.")
    elif net_gain < -qty * 15:
        verdict = "sell_now"
        reason = (f"The forecast is soft. Waiting {fc['days']} days is likely to cost "
                  f"about Rs {abs(net_gain):,.0f} once storage is counted.")
    else:
        verdict = "sell_now"
        reason = (f"The expected gain of Rs {gain:,.0f} barely covers Rs {storage_cost:,.0f} "
                  f"of storage. Locking the price now removes the risk.")

    return {"verdict": verdict, "reason": reason, "net_now": now["net"], "net_later": later["net"],
            "storage_cost": storage_cost, "net_gain": net_gain}


# ---------------------------------------------------------------- market ranking
def rank_markets(markets: List[Dict], qty: float, quality: str, vehicle: str,
                  settings: Settings) -> List[Dict]:
    """Rank by net return, not headline price — the whole point of the product."""
    rows = []
    for m in markets:
        ledger = net_return(m["today_price"], qty, quality, m["km"], vehicle, settings)
        fc = forecast(m["history"], demand=m["demand"])
        absorption = min(1.0, m.get("arrivals", 1000) / (qty * 8))
        score = ledger["net_per_qtl"] * (0.82 + 0.12 * DEMAND_SCORE.get(m["demand"], 0.6) + 0.06 * absorption)
        rows.append({**m, "ledger": ledger, "forecast": fc, "score": score})
    rows.sort(key=lambda r: r["score"], reverse=True)
    return rows


# ---------------------------------------------------------------- buyer matching
def match_buyers(buyers: List[Dict], crop_code: str, qty: float, quality: str,
                  farmer_km: float, settings: Settings) -> List[Dict]:
    pool = [b for b in buyers if crop_code in b["crops"]]
    if not pool:
        return []
    best_pay = max(1, max(b["pay"] for b in pool))
    out = []
    for b in pool:
        crop_pts = 35
        in_range = b["qty_min"] <= qty <= b["qty_max"]
        qty_pts = 20 if in_range else (max(0, 20 - (b["qty_min"] - qty) * 1.6) if qty < b["qty_min"] else 4)
        grade_gap = GRADE_RANK.get(b["grade"], 2) - GRADE_RANK.get(quality, 3)
        qual_pts = 15 if grade_gap <= 0 else max(0, 15 - grade_gap * 9)
        dist_pts = max(0, 12 - abs(b["km"] - farmer_km) / 10)
        price_ratio = b["pay"] / best_pay
        price_pts = max(0, min(10, 10 * (price_ratio ** 12)))
        trust_pts = (5 if b["verified"] else 0) + max(0, (b["rating"] - 3.5) * 2)
        score = max(10, min(98, round(crop_pts + qty_pts + qual_pts + dist_pts + price_pts + trust_pts)))
        ledger = net_return(b["pay"], qty, quality, b["km"], suggest_vehicle(qty), settings)
        out.append({**b, "score": score, "ledger": ledger,
                    "parts": {"crop": crop_pts, "qty": round(qty_pts), "quality": round(qual_pts),
                              "distance": round(dist_pts), "price": round(price_pts), "trust": round(trust_pts)}})
    out.sort(key=lambda r: r["score"], reverse=True)
    return out
