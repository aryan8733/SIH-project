"""
Trains a Random Forest per crop on lag features and saves it to models/.

    python train.py                 trains on data/historical_prices.csv
    python train.py --generate      builds the demo CSV first, then trains

CSV columns: date, crop, market, min_price, modal_price, max_price, demand
"""
import argparse
import os

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

HERE = os.path.dirname(__file__)
DATA_CSV = os.path.join(HERE, "data", "historical_prices.csv")
MODEL_DIR = os.path.join(HERE, "models")
LAGS = [1, 2, 3, 7, 14]


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["market", "date"]).copy()
    for lag in LAGS:
        df[f"lag_{lag}"] = df.groupby("market")["modal_price"].shift(lag)
    df["roll_7"] = df.groupby("market")["modal_price"].transform(lambda s: s.rolling(7).mean())
    df["roll_21"] = df.groupby("market")["modal_price"].transform(lambda s: s.rolling(21).mean())
    df["dow"] = pd.to_datetime(df["date"]).dt.dayofweek
    df["demand_score"] = df["demand"].map({"High": 1.0, "Medium": 0.6, "Low": 0.25}).fillna(0.6)
    df["target"] = df.groupby("market")["modal_price"].shift(-7)   # price 7 days ahead
    return df.dropna()


def train_crop(df: pd.DataFrame, crop: str):
    feats = [f"lag_{l}" for l in LAGS] + ["roll_7", "roll_21", "dow", "demand_score"]
    X, y = df[feats], df["target"]
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    model = RandomForestRegressor(n_estimators=300, max_depth=12, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    mae = mean_absolute_error(y_test, pred)
    r2 = r2_score(y_test, pred)
    print(f"{crop:<10} rows={len(df):<6} MAE=Rs {mae:7.2f}   R2={r2:.3f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump({"model": model, "features": feats}, os.path.join(MODEL_DIR, f"{crop}_rf.joblib"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--generate", action="store_true", help="regenerate the demo CSV first")
    args = ap.parse_args()

    if args.generate or not os.path.exists(DATA_CSV):
        from data.generate_data import write_csv
        write_csv(DATA_CSV)

    df = pd.read_csv(DATA_CSV)
    for crop, group in df.groupby("crop"):
        train_crop(build_features(group), crop)
    print(f"\nModels saved to {MODEL_DIR}")


if __name__ == "__main__":
    main()
