"""
DEMO DATA generator. Produces the same synthetic price history the Node seed
script writes to MongoDB, so the model trains on the numbers the app shows.
Replace with a real Agmarknet / eNAM export before production.
"""
import csv
import os
from datetime import date, timedelta

BASE_PRICE = {"soybean": 4400, "wheat": 2480, "onion": 1650, "tomato": 1250, "cotton": 7250}

MARKETS = [
    ("Dewas", 0.965, "Medium"), ("Indore", 0.985, "High"), ("Ujjain", 1.020, "High"),
    ("Bhopal", 1.045, "High"), ("Sehore", 1.000, "Medium"), ("Harda", 1.012, "Medium"),
    ("Ratlam", 1.008, "Low"), ("Khandwa", 0.995, "Medium"), ("Shajapur", 0.978, "Low"),
    ("Ashta", 0.990, "Medium"),
]

DAYS = 180


def _rng(seed):
    """Deterministic generator so every teammate gets identical data."""
    state = seed & 0xFFFFFFFF

    def nxt():
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = (state ^ (state >> 15)) * (1 | state) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return nxt


def series_for(crop, market_index, factor, days=DAYS):
    import math
    base = BASE_PRICE[crop]
    rnd = _rng(1000 + len(crop) * 97 + market_index * 131)
    drift = (rnd() - 0.42) * 0.9
    price = base * factor * (0.94 + rnd() * 0.10)
    out = []
    for d in range(days - 1, -1, -1):
        seasonal = math.sin((days - 1 - d) / 9) * base * 0.012
        price = price + drift + seasonal * 0.35 + (rnd() - 0.5) * base * 0.014
        out.append((date.today() - timedelta(days=d), round(price)))
    return out


def demo_series(crop="soybean", market_index=2):
    return [p for _, p in series_for(crop, market_index, MARKETS[market_index][1])]


def write_csv(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "crop", "market", "min_price", "modal_price", "max_price", "demand"])
        rows = 0
        for crop in BASE_PRICE:
            for i, (market, factor, demand) in enumerate(MARKETS):
                for d, modal in series_for(crop, i, factor):
                    w.writerow([d.isoformat(), crop, market, round(modal * 0.955),
                                modal, round(modal * 1.05), demand])
                    rows += 1
    print(f"Wrote {rows} demo price rows to {path}")


if __name__ == "__main__":
    write_csv(os.path.join(os.path.dirname(__file__), "historical_prices.csv"))
