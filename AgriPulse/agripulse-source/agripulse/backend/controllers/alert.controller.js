const PriceAlert = require("../models/PriceAlert");
const Market = require("../models/Market");
const MarketPrice = require("../models/MarketPrice");

// GET /api/alerts
exports.list = async (req, res, next) => {
  try { res.json({ success: true, data: await PriceAlert.find({ farmerId: req.user._id }) }); }
  catch (err) { next(err); }
};

// POST /api/alerts
exports.create = async (req, res, next) => {
  try {
    const alert = await PriceAlert.create({ ...req.body, farmerId: req.user._id });
    res.status(201).json({ success: true, data: alert });
  } catch (err) { next(err); }
};

// PATCH /api/alerts/:id  (toggle or change threshold)
exports.update = async (req, res, next) => {
  try {
    const a = await PriceAlert.findOneAndUpdate({ _id: req.params.id, farmerId: req.user._id }, req.body, { new: true });
    if (!a) return res.status(404).json({ success: false, message: "Alert not found." });
    res.json({ success: true, data: a });
  } catch (err) { next(err); }
};

// DELETE /api/alerts/:id
exports.remove = async (req, res, next) => {
  try {
    await PriceAlert.findOneAndDelete({ _id: req.params.id, farmerId: req.user._id });
    res.json({ success: true, message: "Alert deleted." });
  } catch (err) { next(err); }
};

/**
 * GET /api/alerts/triggered
 * Returns every alert whose threshold is crossed today.
 * API-HOOK: call this from a cron job and push the messages to SMS / FCM
 * instead of waiting for the farmer to open the app.
 */
exports.triggered = async (req, res, next) => {
  try {
    const alerts = await PriceAlert.find({ farmerId: req.user._id, isActive: true }).lean();
    const markets = await Market.find({ isActive: true }).lean();
    const out = [];

    for (const a of alerts) {
      for (const m of markets) {
        const p = await MarketPrice.findOne({ marketId: m._id, cropCode: a.cropCode }).sort({ date: -1 }).lean();
        if (p && p.modalPrice >= a.threshold) {
          out.push({
            alertId: a._id, cropCode: a.cropCode, market: m.name, district: m.district,
            price: p.modalPrice, threshold: a.threshold,
            message: `${a.cropCode} price in ${m.district} has reached Rs ${p.modalPrice} per quintal.`
          });
        }
      }
    }
    res.json({ success: true, count: out.length, data: out });
  } catch (err) { next(err); }
};
