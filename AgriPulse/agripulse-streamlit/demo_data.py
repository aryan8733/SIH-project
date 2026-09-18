"""
DEMO DATA for the Streamlit build of AgriPulse.
Deterministic (seeded) so every deploy shows identical numbers.
Mirrors backend/seed/data.js one-to-one.
"""
import math
from datetime import date, timedelta

BASE_PRICE = {"soybean": 4400, "wheat": 2480, "onion": 1650, "tomato": 1250, "cotton": 7250}

MARKETS = [
    {"name": "Dewas Krishi Upaj Mandi",  "district": "Dewas",    "km": 8,   "factor": 0.965, "demand": "Medium", "arrivals": 1850},
    {"name": "Indore Chhawni Mandi",     "district": "Indore",   "km": 36,  "factor": 0.985, "demand": "High",   "arrivals": 6400},
    {"name": "Ujjain Chimanganj Mandi",  "district": "Ujjain",   "km": 68,  "factor": 1.020, "demand": "High",   "arrivals": 4100},
    {"name": "Bhopal Karond Mandi",      "district": "Bhopal",   "km": 150, "factor": 1.045, "demand": "High",   "arrivals": 3200},
    {"name": "Sehore Mandi",             "district": "Sehore",   "km": 96,  "factor": 1.000, "demand": "Medium", "arrivals": 1500},
    {"name": "Harda Mandi",              "district": "Harda",    "km": 118, "factor": 1.012, "demand": "Medium", "arrivals": 1300},
    {"name": "Ratlam Mandi",             "district": "Ratlam",   "km": 140, "factor": 1.008, "demand": "Low",    "arrivals": 1100},
    {"name": "Khandwa Mandi",            "district": "Khandwa",  "km": 165, "factor": 0.995, "demand": "Medium", "arrivals": 900},
    {"name": "Shajapur Mandi",           "district": "Shajapur", "km": 52,  "factor": 0.978, "demand": "Low",    "arrivals": 800},
    {"name": "Ashta Mandi",              "district": "Sehore",   "km": 62,  "factor": 0.990, "demand": "Medium", "arrivals": 1000},
]

FARMERS = [
    {"name": "Ramesh Patidar",   "village": "Bagli",       "district": "Dewas",    "land": 4.2},
    {"name": "Sita Bai Yadav",   "village": "Tonk Khurd",  "district": "Dewas",    "land": 1.8},
    {"name": "Mangilal Chouhan", "village": "Sonkatch",    "district": "Dewas",    "land": 3.1},
    {"name": "Anita Solanki",    "village": "Kannod",      "district": "Dewas",    "land": 2.4},
    {"name": "Jagdish Verma",    "village": "Hatpipliya",  "district": "Dewas",    "land": 5.0},
    {"name": "Kailash Rathore",  "village": "Khategaon",   "district": "Dewas",    "land": 2.0},
    {"name": "Pooja Malviya",    "village": "Ashta",       "district": "Sehore",   "land": 1.5},
    {"name": "Devilal Sisodiya", "village": "Barot",       "district": "Shajapur", "land": 6.3},
    {"name": "Sunita Jat",       "village": "Pipalrawan",  "district": "Dewas",    "land": 2.7},
    {"name": "Bherulal Gurjar",  "village": "Satwas",      "district": "Dewas",    "land": 3.6},
]

BUYERS = [
    {"company": "Sanchi Agro Processors",        "person": "Nitin Agrawal", "crops": ["soybean", "wheat"],           "qty_min": 5,  "qty_max": 200, "grade": "A", "pay": 4520, "district": "Ujjain",  "km": 68,  "verified": True,  "rating": 4.6, "terms": "50% advance, rest in 2 days"},
    {"company": "Malwa Oil Mills",               "person": "Rakesh Jain",   "crops": ["soybean"],                    "qty_min": 10, "qty_max": 500, "grade": "A", "pay": 4575, "district": "Indore",  "km": 36,  "verified": True,  "rating": 4.8, "terms": "Full payment on pickup"},
    {"company": "Narmada Foods Pvt Ltd",         "person": "Sameer Khan",   "crops": ["wheat", "soybean"],           "qty_min": 20, "qty_max": 800, "grade": "A", "pay": 4480, "district": "Bhopal",  "km": 150, "verified": True,  "rating": 4.4, "terms": "Payment in 7 days"},
    {"company": "Chetak Traders",                "person": "Om Prakash",    "crops": ["soybean", "cotton"],          "qty_min": 5,  "qty_max": 120, "grade": "B", "pay": 4390, "district": "Dewas",   "km": 10,  "verified": False, "rating": 3.9, "terms": "Cash on pickup"},
    {"company": "Surya Onion Export",            "person": "Deepak Shinde", "crops": ["onion"],                      "qty_min": 30, "qty_max": 900, "grade": "A", "pay": 1780, "district": "Indore",  "km": 36,  "verified": True,  "rating": 4.5, "terms": "Payment in 3 days"},
    {"company": "FreshKart Retail",              "person": "Aarti Mehra",   "crops": ["tomato", "onion"],            "qty_min": 5,  "qty_max": 80,  "grade": "A", "pay": 1360, "district": "Indore",  "km": 36,  "verified": True,  "rating": 4.2, "terms": "UPI on delivery"},
    {"company": "Vindhya Cotton Ginning",        "person": "Harish Patel",  "crops": ["cotton"],                     "qty_min": 15, "qty_max": 400, "grade": "A", "pay": 7480, "district": "Khandwa", "km": 165, "verified": True,  "rating": 4.3, "terms": "Payment in 5 days"},
    {"company": "Annapurna Flour Mill",          "person": "Girish Soni",   "crops": ["wheat"],                      "qty_min": 10, "qty_max": 300, "grade": "B", "pay": 2530, "district": "Dewas",   "km": 12,  "verified": True,  "rating": 4.1, "terms": "Cash on pickup"},
    {"company": "Agri FPO Sonkatch",             "person": "Lokesh Verma",  "crops": ["soybean", "wheat", "onion"],  "qty_min": 2,  "qty_max": 60,  "grade": "B", "pay": 4430, "district": "Dewas",   "km": 22,  "verified": True,  "rating": 4.7, "terms": "Same-day UPI"},
    {"company": "Shree Balaji Commission Agent", "person": "Manoj Gupta",   "crops": ["soybean", "tomato"],          "qty_min": 5,  "qty_max": 150, "grade": "C", "pay": 4260, "district": "Ujjain",  "km": 68,  "verified": False, "rating": 3.5, "terms": "Payment in 10 days"},
]


def _rng(seed: int):
    state = seed & 0xFFFFFFFF
    def nxt():
        nonlocal state
        state = (state + 0x6D2B79F5) & 0xFFFFFFFF
        t = (state ^ (state >> 15)) * (1 | state) & 0xFFFFFFFF
        t = (t + ((t ^ (t >> 7)) * (61 | t) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def build_history(crop_code: str, market_index: int, factor: float, days: int = 60):
    base = BASE_PRICE[crop_code]
    rnd = _rng(1000 + len(crop_code) * 97 + market_index * 131)
    drift = (rnd() - 0.42) * 0.9
    price = base * factor * (0.94 + rnd() * 0.10)
    out = []
    for d in range(days - 1, -1, -1):
        seasonal = math.sin((days - 1 - d) / 9) * base * 0.012
        price = price + drift + seasonal * 0.35 + (rnd() - 0.5) * base * 0.014
        out.append(round(price))
    return out


def markets_for_crop(crop_code: str):
    """Every mandi with its today price + 60-day history, ready for engine.rank_markets."""
    rows = []
    for i, m in enumerate(MARKETS):
        hist = build_history(crop_code, i, m["factor"])
        rows.append({**m, "history": hist, "today_price": hist[-1]})
    return rows
