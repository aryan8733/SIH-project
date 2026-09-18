/**
 * AgriPulse API client.
 *
 * The UI in index.html runs in offline demo mode by default so it can be shown
 * without a server. Point it at the backend by setting the base URL below (or
 * window.AGRIPULSE_API before the app script runs) and calling these functions
 * instead of the in-browser engines.
 *
 * Every endpoint here exists in backend/routes.
 */

const BASE = (typeof window !== "undefined" && window.AGRIPULSE_API) || "http://localhost:5000/api";

const TOKEN_KEY = "agripulse.token";
export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = t => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} };

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  let data;
  try { data = await res.json(); } catch { data = { success: false, message: res.statusText }; }
  if (!res.ok) throw Object.assign(new Error(data.message || "Request failed"), { status: res.status, data });
  return data;
}

/* ---------------- auth ---------------- */
export const auth = {
  register: payload => request("/auth/register", { method: "POST", body: payload, auth: false }),
  async login(phone, password) {
    const out = await request("/auth/login", { method: "POST", body: { phone, password }, auth: false });
    setToken(out.token);
    return out;
  },
  me: () => request("/auth/me"),
  updateMe: payload => request("/auth/me", { method: "PATCH", body: payload }),
  logout: () => setToken(null)
};

/* ---------------- market data ---------------- */
export const markets = {
  list: () => request("/markets"),
  prices: crop => request(`/prices?crop=${encodeURIComponent(crop)}`),
  history: (crop, marketId, days = 60) =>
    request(`/prices/history?crop=${encodeURIComponent(crop)}&marketId=${marketId}&days=${days}`)
};

/* ---------------- the four questions ---------------- */
export const recommend = {
  // Everything the farmer dashboard needs in one call.
  decision: lot => request("/recommend/decision", { method: "POST", body: lot }),
  markets: lot => request("/recommend/markets", { method: "POST", body: lot }),
  buyers: lot => request("/recommend/buyers", { method: "POST", body: lot }),
  forecast: (cropCode, marketId, days = 7) =>
    request("/recommend/forecast", { method: "POST", body: { cropCode, marketId, days } })
};

/* ---------------- farmer ---------------- */
export const crops = {
  list: () => request("/crops"),
  create: payload => request("/crops", { method: "POST", body: payload }),
  update: (id, payload) => request(`/crops/${id}`, { method: "PATCH", body: payload }),
  remove: id => request(`/crops/${id}`, { method: "DELETE" })
};

export const lots = {
  mine: () => request("/lots/mine"),
  available: (crop) => request(`/lots/available${crop ? `?crop=${encodeURIComponent(crop)}` : ""}`),
  create: payload => request("/lots", { method: "POST", body: payload }),
  update: (id, payload) => request(`/lots/${id}`, { method: "PATCH", body: payload })
};

export const offers = {
  list: () => request("/offers"),
  create: payload => request("/offers", { method: "POST", body: payload }),
  accept: id => request(`/offers/${id}/accept`, { method: "PATCH" }),
  reject: id => request(`/offers/${id}/reject`, { method: "PATCH" }),
  counter: (id, price) => request(`/offers/${id}/counter`, { method: "PATCH", body: { price } })
};

export const transactions = { list: () => request("/transactions") };

export const alerts = {
  list: () => request("/alerts"),
  triggered: () => request("/alerts/triggered"),
  create: payload => request("/alerts", { method: "POST", body: payload }),
  update: (id, payload) => request(`/alerts/${id}`, { method: "PATCH", body: payload }),
  remove: id => request(`/alerts/${id}`, { method: "DELETE" })
};

/* ---------------- admin ---------------- */
export const admin = {
  farmers: () => request("/admin/farmers"),
  buyers: () => request("/admin/buyers"),
  verifyBuyer: (userId, status = "verified") =>
    request(`/admin/buyers/${userId}/verify`, { method: "PATCH", body: { status } }),
  settings: () => request("/admin/settings"),
  updateSettings: payload => request("/admin/settings", { method: "PATCH", body: payload }),
  analytics: () => request("/admin/analytics"),
  complaints: () => request("/admin/complaints"),
  updateComplaint: (id, status) => request(`/admin/complaints/${id}`, { method: "PATCH", body: { status } })
};

export default { auth, markets, recommend, crops, lots, offers, transactions, alerts, admin };
