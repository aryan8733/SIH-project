# AgriPulse — Streamlit build

SIH26132 — Strengthening Market Linkages and Price Discovery for Farmers.

This is a **self-contained Python version** of AgriPulse, built specifically to
deploy on **Streamlit Community Cloud** for free with zero infrastructure —
no database, no separate backend, no API keys. All decision logic (net-return
ledger, mandi ranking, price forecast, buyer matching, sell-now-or-wait) runs
in plain Python inside `engine.py`, using the same formulas as the full
Node/Mongo/FastAPI stack in the rest of this repository.

## Files

```
streamlit_app/
├── app.py            the whole UI — farmer / buyer / admin views
├── engine.py         net return, market ranking, forecast, buyer matching
├── demo_data.py       seeded farmers, buyers, mandis, 60-day price history
├── requirements.txt
└── .streamlit/config.toml   AgriPulse colour theme
```

## Deploy on Streamlit Community Cloud (free)

1. Create a **new GitHub repository** and push the contents of this folder
   to its root (so `app.py` sits at the repo's top level — not nested inside
   another `streamlit_app/` folder, unless you point Streamlit at that path).

   ```bash
   cd streamlit_app
   git init
   git add .
   git commit -m "AgriPulse Streamlit build"
   git branch -M main
   git remote add origin https://github.com/<you>/agripulse-streamlit.git
   git push -u origin main
   ```

2. Go to **https://share.streamlit.io**, sign in with GitHub.
3. **New app** → pick the repository and branch → **Main file path**: `app.py`.
4. Click **Deploy**. First build takes 1–2 minutes (installing pandas, plotly).

No secrets, no environment variables, no database to provision. That's the whole deployment.

## Run it locally first (recommended)

```bash
cd streamlit_app
pip install -r requirements.txt
streamlit run app.py
```

Opens at http://localhost:8501.

## What's different from the full-stack version

This build keeps every number the same but simplifies the plumbing so it can
run on Streamlit's free tier:

- **No MongoDB** — lots, offers and transactions live in `st.session_state`,
  so they persist for your browser session and reset when the app restarts
  or another visitor opens it. Good enough for a live demo; not for multiple
  concurrent real users.
- **No FastAPI ML service** — the same regression formula from
  `ml-service/predict.py` is reimplemented directly in `engine.py`.
- **No JWT auth** — role is picked from a sidebar radio button instead of a
  login form, since a hackathon demo needs speed, not real accounts.

If you need multi-user persistence, real authentication or the Random Forest
model, deploy the full stack instead (see the root `README.md`): Node/Express
API + MongoDB + FastAPI, on Render/Railway + MongoDB Atlas. Both versions
share the exact same ledger and ranking math, so the numbers they show agree.
