/**
 * Least-squares fit on the price series. Identical maths to sklearn LinearRegression
 * on a single feature (day index), so the JS fallback and the Python service agree.
 */
function linearRegression(values) {
  const n = values.length;
  const xs = values.map((_, i) => i);
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = values.reduce((a, b) => a + b, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - meanX) * (values[i] - meanY); den += (xs[i] - meanX) ** 2; }
  const slope = den ? num / den : 0;
  const intercept = meanY - slope * meanX;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * xs[i];
    ssRes += (values[i] - pred) ** 2;
    ssTot += (values[i] - meanY) ** 2;
  }
  return {
    slope, intercept,
    r2: ssTot ? 1 - ssRes / ssTot : 0,
    residualStd: Math.sqrt(ssRes / Math.max(n - 2, 1))
  };
}

const DEMAND_PUSH = { High: 1, Medium: 0, Low: -0.8 };

// Pure-JS forecast. Used when ML_SERVICE_URL is not configured or the service is down.
function localForecast({ series, demand = "Medium", days = 7 }) {
  const window = series.slice(-21);
  const reg = linearRegression(window);
  const current = window[window.length - 1];
  const push = (DEMAND_PUSH[demand] ?? 0) * current * 0.0016;
  const point = current + (reg.slope + push) * days;
  const band = Math.max(reg.residualStd * 1.28, current * 0.008) + Math.abs(reg.slope) * days * 0.35;
  return {
    engine: "js-linear-regression",
    days,
    currentPrice: Math.round(current),
    predictedPrice: Math.round(point),
    lowerBound: Math.round(point - band),
    upperBound: Math.round(point + band),
    slopePerDay: Number(reg.slope.toFixed(2)),
    r2: Number(reg.r2.toFixed(3)),
    direction: reg.slope > current * 0.0004 ? "rising" : reg.slope < -current * 0.0004 ? "falling" : "flat",
    changePct: Number((((point - current) / current) * 100).toFixed(2)),
    disclaimer: "Prediction is an estimate based on available data and should not be treated as a guaranteed future price."
  };
}

// Calls the Python service first, falls back to the JS model so the API never breaks.
// Uses the global fetch built into Node 18+, so there is no extra HTTP dependency.
async function predict({ cropCode, marketName, series, demand, days = 7 }) {
  const url = process.env.ML_SERVICE_URL;
  if (url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const res = await fetch(`${url}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crop: cropCode, market: marketName, series, demand, days }),
        signal: controller.signal
      });
      if (!res.ok) throw new Error(`ML service returned ${res.status}`);
      const data = await res.json();
      return { ...data, engine: data.engine || "python-sklearn" };
    } catch (err) {
      console.warn("ML service unavailable, using JS fallback:", err.message);
    } finally {
      clearTimeout(timer);
    }
  }
  return localForecast({ series, demand, days });
}

module.exports = { predict, localForecast, linearRegression };
