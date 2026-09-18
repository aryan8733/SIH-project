const Market = require("../models/Market");
const MarketPrice = require("../models/MarketPrice");
const { roadDistanceKm } = require("../services/geo");

// GET /api/markets
exports.listMarkets = async (req, res, next) => {
  try {
    const markets = await Market.find({ isActive: true }).lean();
    const origin = req.user?.location;
    const withDistance = markets.map(m => ({ ...m, distanceKm: origin ? roadDistanceKm(origin, m) : null }));
    withDistance.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    res.json({ success: true, count: withDistance.length, data: withDistance });
  } catch (err) { next(err); }
};

// POST /api/markets  (admin)
exports.createMarket = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await Market.create(req.body) }); }
  catch (err) { next(err); }
};

// PATCH /api/markets/:id  (admin)
exports.updateMarket = async (req, res, next) => {
  try {
    const m = await Market.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!m) return res.status(404).json({ success: false, message: "Market not found." });
    res.json({ success: true, data: m });
  } catch (err) { next(err); }
};

// GET /api/prices?crop=soybean
exports.latestPrices = async (req, res, next) => {
  try {
    const { crop } = req.query;
    if (!crop) return res.status(400).json({ success: false, message: "Query param 'crop' is required." });

    const markets = await Market.find({ isActive: true }).lean();
    const origin = req.user?.location;

    const rows = await Promise.all(markets.map(async m => {
      const p = await MarketPrice.findOne({ marketId: m._id, cropCode: crop }).sort({ date: -1 }).lean();
      if (!p) return null;
      const week = await MarketPrice.find({ marketId: m._id, cropCode: crop }).sort({ date: -1 }).limit(8).lean();
      const old = week[week.length - 1];
      return {
        marketId: m._id, market: m.name, district: m.district, demand: m.demand, arrivalsQtl: m.arrivalsQtl,
        distanceKm: origin ? roadDistanceKm(origin, m) : null,
        minPrice: p.minPrice, modalPrice: p.modalPrice, maxPrice: p.maxPrice, date: p.date,
        weekChangePct: old ? Number((((p.modalPrice - old.modalPrice) / old.modalPrice) * 100).toFixed(2)) : null
      };
    }));

    res.json({ success: true, crop, data: rows.filter(Boolean) });
  } catch (err) { next(err); }
};

// GET /api/prices/history?crop=soybean&marketId=...&days=60
exports.priceHistory = async (req, res, next) => {
  try {
    const { crop, marketId, days = 60 } = req.query;
    if (!crop || !marketId)
      return res.status(400).json({ success: false, message: "Query params 'crop' and 'marketId' are required." });

    const rows = await MarketPrice.find({ cropCode: crop, marketId })
      .sort({ date: -1 }).limit(Number(days)).lean();

    res.json({ success: true, crop, marketId, count: rows.length, data: rows.reverse() });
  } catch (err) { next(err); }
};

// POST /api/prices  (admin) - manual entry or ingestion job
exports.upsertPrice = async (req, res, next) => {
  try {
    const { marketId, cropCode, minPrice, modalPrice, maxPrice, date, source } = req.body;
    const day = new Date(date || Date.now()); day.setHours(0, 0, 0, 0);
    const doc = await MarketPrice.findOneAndUpdate(
      { marketId, cropCode, date: day },
      { minPrice, modalPrice, maxPrice, source: source || "manual" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ success: true, data: doc });
  } catch (err) { next(err); }
};
