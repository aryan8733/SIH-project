const Market = require("../models/Market");
const MarketPrice = require("../models/MarketPrice");
const BuyerProfile = require("../models/BuyerProfile");
const Settings = require("../models/Settings");
const { rankMarkets } = require("../services/ranking");
const { matchBuyers } = require("../services/matching");
const { predict } = require("../services/forecast");
const { sellNowOrWait } = require("../services/timing");
const { suggestVehicle } = require("../services/transport");
const { roadDistanceKm } = require("../services/geo");

async function loadPriceData(cropCode) {
  const markets = await Market.find({ isActive: true }).lean();
  const priceByMarket = {}, historyByMarket = {};
  await Promise.all(markets.map(async m => {
    const hist = await MarketPrice.find({ marketId: m._id, cropCode }).sort({ date: -1 }).limit(60).lean();
    if (!hist.length) return;
    historyByMarket[String(m._id)] = hist.slice().reverse();
    priceByMarket[String(m._id)] = hist[0];
  }));
  return { markets, priceByMarket, historyByMarket };
}

function originFrom(req) {
  const { lat, lng } = req.body;
  if (lat != null && lng != null) return { lat, lng };
  return req.user?.location?.lat != null ? req.user.location : { lat: 22.9676, lng: 76.0534 }; // Dewas
}

// POST /api/recommend/markets  { cropCode, quantityQtl, quality, vehicle }
exports.markets = async (req, res, next) => {
  try {
    const { cropCode, quantityQtl, quality = "A", vehicle } = req.body;
    const settings = await Settings.current();
    const { markets, priceByMarket, historyByMarket } = await loadPriceData(cropCode);
    if (!markets.length) return res.status(404).json({ success: false, message: "No market data for this crop yet." });

    const rows = rankMarkets({
      markets, priceByMarket, historyByMarket, origin: originFrom(req),
      quantityQtl, quality, vehicle: vehicle || suggestVehicle(quantityQtl), settings
    });

    const byHighestPrice = [...rows].sort((a, b) => b.price.modal - a.price.modal)[0];
    res.json({
      success: true,
      recommended: rows[0],
      alternatives: rows.slice(1),
      // The headline the demo is built on: highest price is often not the best mandi.
      insight: byHighestPrice && String(byHighestPrice.market.id) !== String(rows[0].market.id) ? {
        highestPriceMarket: byHighestPrice.market.district,
        highestPriceNet: byHighestPrice.ledger.net,
        recommendedMarket: rows[0].market.district,
        recommendedNet: rows[0].ledger.net,
        extraIncome: rows[0].ledger.net - byHighestPrice.ledger.net
      } : null
    });
  } catch (err) { next(err); }
};

// POST /api/recommend/buyers
exports.buyers = async (req, res, next) => {
  try {
    const { cropCode, quantityQtl, quality = "A" } = req.body;
    const settings = await Settings.current();
    const buyers = await BuyerProfile.find({ requiredCrops: cropCode }).populate("userId", "name phone").lean();
    const { markets, priceByMarket } = await loadPriceData(cropCode);
    const bestMandiPrice = Math.max(0, ...Object.values(priceByMarket).map(p => p.modalPrice));

    const matches = matchBuyers({
      buyers, cropCode, quantityQtl, quality, origin: originFrom(req), bestMandiPrice, settings
    });
    res.json({ success: true, count: matches.length, data: matches, marketsConsidered: markets.length });
  } catch (err) { next(err); }
};

// POST /api/recommend/forecast  { cropCode, marketId, days }
exports.forecast = async (req, res, next) => {
  try {
    const { cropCode, marketId, days = 7 } = req.body;
    const market = await Market.findById(marketId).lean();
    if (!market) return res.status(404).json({ success: false, message: "Market not found." });
    const hist = await MarketPrice.find({ marketId, cropCode }).sort({ date: -1 }).limit(60).lean();
    if (hist.length < 10) return res.status(400).json({ success: false, message: "Not enough history to forecast." });

    const series = hist.reverse().map(p => p.modalPrice);
    const out = await predict({ cropCode, marketName: market.name, series, demand: market.demand, days });
    res.json({ success: true, market: market.name, crop: cropCode, forecast: out });
  } catch (err) { next(err); }
};

/**
 * POST /api/recommend/decision
 * The one call the farmer dashboard needs: where, to whom, when and how much.
 */
exports.decision = async (req, res, next) => {
  try {
    const { cropCode, quantityQtl, quality = "A", vehicle } = req.body;
    const settings = await Settings.current();
    const origin = originFrom(req);
    const v = vehicle || suggestVehicle(quantityQtl);

    const { markets, priceByMarket, historyByMarket } = await loadPriceData(cropCode);
    if (!markets.length) return res.status(404).json({ success: false, message: "No market data for this crop yet." });

    const rows = rankMarkets({ markets, priceByMarket, historyByMarket, origin, quantityQtl, quality, vehicle: v, settings });
    const best = rows[0];

    const series = historyByMarket[String(best.market.id)].map(p => p.modalPrice);
    const marketDoc = markets.find(m => String(m._id) === String(best.market.id));
    const fc = await predict({ cropCode, marketName: best.market.name, series, demand: best.market.demand });

    const when = sellNowOrWait({
      forecast: fc, quantityQtl, quality,
      distanceKm: roadDistanceKm(origin, marketDoc), vehicle: v, settings
    });

    const buyerProfiles = await BuyerProfile.find({ requiredCrops: cropCode }).populate("userId", "name phone").lean();
    const bestMandiPrice = Math.max(0, ...Object.values(priceByMarket).map(p => p.modalPrice));
    const buyerMatches = matchBuyers({ buyers: buyerProfiles, cropCode, quantityQtl, quality, origin, bestMandiPrice, settings });

    res.json({
      success: true,
      lot: { cropCode, quantityQtl, quality, vehicle: v },
      where: { recommended: best, alternatives: rows.slice(1, 5) },
      toWhom: { recommended: buyerMatches[0] || null, alternatives: buyerMatches.slice(1, 5) },
      when,
      howMuch: best.ledger,
      settingsUsed: {
        transportRatePerKm: settings.transportRatePerKm, chargeReturnTrip: settings.chargeReturnTrip,
        mandiFeePct: settings.mandiFeePct, commissionPct: settings.commissionPct,
        labourPerQtl: settings.labourPerQtl, packingPerQtl: settings.packingPerQtl
      }
    });
  } catch (err) { next(err); }
};
