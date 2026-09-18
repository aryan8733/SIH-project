# AgriPulse

**Smart India Hackathon 2026 — SIH26132: Strengthening Market Linkages and Price Discovery for Farmers**

AgriPulse does not stop at showing mandi prices. It answers the four questions that actually decide a farmer's income:

| Question | What AgriPulse answers |
|---|---|
| **Where?** | Which mandi pays most **after** transport, mandi fee, commission, labour and packing |
| **To whom?** | Which verified buyer fits this crop, quantity, grade and location |
| **When?** | Sell today or hold — a 7-day forecast weighed against storage cost |
| **How much?** | The exact rupees in hand, shown as a line-by-line ledger |

---

## 1. What's in the box

```
agripulse/
├── frontend/                 Single-page UI (no build step)
│   ├── index.html            The whole app: landing, auth, farmer, buyer, admin
│   └── src/services/api.js   Typed client for every backend endpoint
│
├── backend/                  Node + Express + MongoDB API
│   ├── server.js
│   ├── config/               db connection, crop & vehicle constants
│   ├── models/               13 Mongoose models
│   ├── middleware/           JWT auth, role guard, validation, errors
│   ├── services/             THE BUSINESS LOGIC
│   │   ├── geo.js            haversine + road factor
│   │   ├── transport.js      distance x rate x trips x vehicle
│   │   ├── ledger.js         net return calculation
│   │   ├── forecast.js       calls the ML service, JS fallback built in
│   │   ├── ranking.js        ranks mandis by net return, not price
│   │   ├── matching.js       buyer match score out of 100
│   │   └── timing.js         sell now vs wait
│   ├── controllers/          9 controllers
│   ├── routes/               10 route files
│   └── seed/                 demo data + seeding script
│
├── ml-service/               Python + FastAPI + scikit-learn
│   ├── main.py               POST /predict
│   ├── predict.py            LinearRegression + demand adjustment
│   ├── train.py              RandomForest on lag features
│   └── data/generate_data.py demo dataset generator
│
├── docker-compose.yml        Run everything with one command
└── .env.example
```

---

## 2. Run it locally

### Requirements
- Node.js 18+
- MongoDB 6+ running locally, **or** a free MongoDB Atlas cluster
- Python 3.10+ (optional — the backend has a JS fallback if the ML service is off)

### Step 1 — Backend

```bash
cd backend
npm install
cp .env.example .env
```

Open `.env` and set two things:

```
MONGO_URI=mongodb://127.0.0.1:27017/agripulse
JWT_SECRET=<paste a long random string>
```

Generate the secret with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Seed the demo data and start the API:

```bash
npm run seed     # 10 farmers, 10 buyers, 10 mandis, 5 crops, 3000 price records, 15 lots, 10 offers
npm run dev      # http://localhost:5000
```

Check it: `curl http://localhost:5000/api/health`

### Step 2 — ML service (optional but recommended)

```bash
cd ml-service
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python data/generate_data.py      # writes the demo CSV
python train.py                   # trains a RandomForest per crop
uvicorn main:app --reload --port 8000
```

If this service is not running the backend logs a warning and uses its own JavaScript regression — same maths, so the demo never breaks.

### Step 3 — Frontend

```bash
cd frontend
npx serve -l 5173 .
```

Open http://localhost:5173

### Or: everything at once with Docker

```bash
docker compose up --build
docker compose exec backend npm run seed
```
UI on http://localhost:8080, API on http://localhost:5000, ML on http://localhost:8000.

---

## 3. Demo accounts

All seeded with password **`demo1234`**.

| Role | Mobile | Who |
|---|---|---|
| Farmer | `9826000001` | Ramesh Patidar — Bagli, Dewas — soybean 10 quintal, A grade |
| Buyer | `9826100002` | Malwa Oil Mills, Indore — verified |
| Admin | `9000000000` | Platform operations |

---

## 4. The demo flow to show the judges

1. Sign in as the farmer. The dashboard shows the recommended mandi, the forecast, the buyer match and the net-return ledger.
2. Open **Compare markets**. Bhopal quotes the highest price — the app recommends Ujjain and shows the rupee difference. This is the whole pitch in one screen.
3. Open **Price forecast**. Regression slope, R², 7-day band, and a sell-now-or-wait verdict costed against storage.
4. Open **Matching buyers**. Match percentages with the score breakdown, so it is not a black box.
5. Publish a crop lot.
6. Sign in as the buyer, open the lot, send an offer.
7. Back as the farmer, accept it. A transaction is written, the lot closes, the other offers auto-reject.
8. Sign in as admin, change the transport rate from ₹25/km to ₹40/km, then reopen the farmer comparison — the recommended mandi changes. Live, not hardcoded.

---

## 5. API reference

Base URL `http://localhost:5000/api`. Everything except register/login needs `Authorization: Bearer <token>`.

### Auth
```
POST   /auth/register
POST   /auth/login
GET    /auth/me
PATCH  /auth/me
```

### Market data
```
GET    /markets
GET    /prices?crop=soybean
GET    /prices/history?crop=soybean&marketId=<id>&days=60
POST   /prices                        (admin)
```

### The four questions
```
POST   /recommend/decision            where + to whom + when + how much, in one call
POST   /recommend/markets
POST   /recommend/buyers
POST   /recommend/forecast
```

### Farmer
```
GET|POST|PATCH|DELETE  /crops
GET    /lots/mine
POST   /lots
GET    /alerts        GET /alerts/triggered      POST|PATCH|DELETE /alerts
```

### Marketplace
```
GET    /lots/available?crop=soybean
POST   /offers                        (buyer)
GET    /offers
PATCH  /offers/:id/accept             (farmer)
PATCH  /offers/:id/reject             (farmer)
PATCH  /offers/:id/counter            (farmer)
GET    /transactions
```

### Admin
```
GET    /admin/farmers
GET    /admin/buyers
PATCH  /admin/buyers/:userId/verify
GET|PATCH /admin/settings             transport rate, mandi fee, commission, platform fee
GET    /admin/analytics
GET|PATCH /admin/complaints
```

### Sample request

```bash
# 1. Log in
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"9826000001","password":"demo1234"}' | jq -r .token)

# 2. Ask the four questions for a 10-quintal A-grade soybean lot
curl -s -X POST http://localhost:5000/api/recommend/decision \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"cropCode":"soybean","quantityQtl":10,"quality":"A"}' | jq
```

### Sample response (trimmed)

```json
{
  "success": true,
  "lot": { "cropCode": "soybean", "quantityQtl": 10, "quality": "A", "vehicle": "tractor" },
  "where": {
    "recommended": {
      "market": { "name": "Ujjain Chimanganj Mandi", "district": "Ujjain", "demand": "High" },
      "distanceKm": 68,
      "price": { "min": 4251, "modal": 4451, "max": 4674 },
      "ledger": {
        "revenue": 44510,
        "breakdown": { "transport": 2720, "mandiFee": 668, "commission": 445, "labour": 220, "packing": 180 },
        "totalCost": 4233,
        "net": 40277,
        "netPerQtl": 4028
      }
    }
  },
  "toWhom": {
    "recommended": {
      "companyName": "Malwa Oil Mills",
      "matchScore": 94,
      "offeredPrice": 4575,
      "verificationStatus": "verified",
      "scoreBreakdown": { "crop": 40, "quantity": 20, "quality": 15, "distance": 12, "price": 10, "trust": 9 }
    }
  },
  "when": {
    "verdict": "sell_now",
    "reason": "The expected gain of Rs 310 barely covers Rs 280 of storage. Locking the price now removes the risk.",
    "forecast": { "currentPrice": 4451, "lowerBound": 4402, "upperBound": 4562, "r2": 0.71, "direction": "flat" }
  }
}
```

---

## 6. How the pieces connect

```
Browser (frontend/index.html)
    |  fetch, JWT in the Authorization header
    v
Express API (backend)  ---- Mongoose ---->  MongoDB
    |
    |  POST /predict (axios, 4s timeout, JS fallback on failure)
    v
FastAPI ML service  ---->  scikit-learn model
```

- **Frontend to backend**: `frontend/src/services/api.js` wraps every endpoint and attaches the token from `localStorage`.
- **Backend to database**: `config/db.js` connects with Mongoose; models live in `backend/models`.
- **Backend to ML**: `services/forecast.js` posts the price series to `ML_SERVICE_URL`. On timeout or error it runs `localForecast()`, which implements the identical regression in JavaScript.

The UI ships in **offline demo mode** so it can be presented with no server at all — the same engines (ledger, ranking, matching, forecast) run in the browser. To switch it to the live API, set `window.AGRIPULSE_API` and call the functions in `api.js` in place of the in-page engine calls.

---

## 7. Where the mock data ends and the real world begins

Search the codebase for these markers:

- **`DEMO DATA`** in `backend/seed/data.js` and `ml-service/data/generate_data.py` — synthetic prices, farmers and buyers.
- **`API-HOOK:`** — every place a real service attaches:
  - `services/geo.js` → OSRM or Google Directions for true road distance
  - `controllers/market.controller.js` `POST /api/prices` → the Agmarknet / eNAM ingestion job
  - `controllers/alert.controller.js` `triggered` → cron + SMS gateway or FCM push
- `AGMARKNET_API_KEY` in `.env.example` → register at data.gov.in for the live mandi price resource.

---

## 8. Deploying

**Database** — MongoDB Atlas free tier. Create a cluster, add `0.0.0.0/0` to network access for a hackathon demo, copy the connection string into `MONGO_URI`.

**Backend** — Render or Railway. Root directory `backend`, build `npm install`, start `npm start`. Set `MONGO_URI`, `JWT_SECRET`, `ML_SERVICE_URL`, `CORS_ORIGIN` as environment variables. Run the seed once from the service shell: `npm run seed`.

**ML service** — Render or Railway with the included `ml-service/Dockerfile`, or Hugging Face Spaces. Put the resulting URL in the backend's `ML_SERVICE_URL`.

**Frontend** — Netlify, Vercel or GitHub Pages. It is a static folder; drag `frontend/` in. If you wire it to the live API, set `window.AGRIPULSE_API` to the deployed backend URL and add that origin to `CORS_ORIGIN`.

---

## 9. Security

- Passwords hashed with bcrypt, cost factor 12, and `select: false` so they never leave the database by accident.
- JWT with configurable expiry; `protect` verifies, `allow(...roles)` enforces role-based access.
- express-validator on every write route, returning field-level 422 errors.
- Rate limiting: 50 auth requests per 15 minutes, 300 API requests per minute.
- CORS restricted to the origins listed in `CORS_ORIGIN`.
- Central error handler that hides stack traces outside development.
- No secret is ever hardcoded — everything comes from `.env`, and `.env` is gitignored.

---

## 10. Revenue model

Free for farmers. Price discovery, comparison, forecasting and buyer matching cost them nothing — charging for it would defeat the purpose.

- **Primary**: 1% transaction fee charged to the buyer. A ₹1,00,000 deal earns ₹1,000. Implemented in `offer.controller.js` and stored on every `Transaction`.
- **Secondary**: subscriptions for processors, institutional buyers and large traders.
- **Future**: anonymised B2B demand analytics, logistics partnerships, credit and insurance referrals.

---

Built for SIH 2026. All prices, farmers and buyers in the seed data are demo data.
