require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const origins = (process.env.CORS_ORIGIN || "*").split(",").map(s => s.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins, credentials: true }));

app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, max: 50 }));
app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 300 }));

app.get("/api/health", (req, res) =>
  res.json({ success: true, service: "agripulse-api", time: new Date().toISOString() })
);

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/markets", require("./routes/market.routes"));
app.use("/api/prices", require("./routes/price.routes"));
app.use("/api/crops", require("./routes/crop.routes"));
app.use("/api/lots", require("./routes/lot.routes"));
app.use("/api/offers", require("./routes/offer.routes"));
app.use("/api/transactions", require("./routes/transaction.routes"));
app.use("/api/alerts", require("./routes/alert.routes"));
app.use("/api/recommend", require("./routes/recommend.routes"));
app.use("/api/admin", require("./routes/admin.routes"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
connectDB()
  .then(() => app.listen(PORT, () => console.log(`AgriPulse API listening on http://localhost:${PORT}`)))
  .catch(err => { console.error("Startup failed:", err.message); process.exit(1); });
