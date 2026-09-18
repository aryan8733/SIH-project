const { netReturn } = require("./ledger");
const { roadDistanceKm } = require("./geo");
const { suggestVehicle } = require("./transport");
const { localForecast } = require("./forecast");

const DEMAND_SCORE = { High: 1, Medium: 0.6, Low: 0.25 };

/**
 * Rank markets by what the farmer keeps, not by the board price.
 * score = netPerQtl weighted by demand and by whether the mandi can absorb the lot.
 */
function rankMarkets({ markets, priceByMarket, historyByMarket, origin, quantityQtl, quality, vehicle, settings }) {
  const v = vehicle || suggestVehicle(quantityQtl);
  const rows = markets.map(market => {
    const price = priceByMarket[String(market._id)];
    if (!price) return null;
    const distanceKm = roadDistanceKm(origin, market);
    const ledger = netReturn({
      modalPrice: price.modalPrice, quantityQtl, quality, distanceKm, vehicle: v, settings
    });
    const series = (historyByMarket[String(market._id)] || []).map(p => p.modalPrice);
    const forecast = series.length >= 8 ? localForecast({ series, demand: market.demand }) : null;
    const absorption = Math.min(1, (market.arrivalsQtl || 500) / (quantityQtl * 8));
    const score = ledger.netPerQtl * (0.82 + 0.12 * (DEMAND_SCORE[market.demand] ?? 0.6) + 0.06 * absorption);
    return {
      market: { id: market._id, name: market.name, district: market.district, demand: market.demand, arrivalsQtl: market.arrivalsQtl },
      distanceKm, price: { min: price.minPrice, modal: price.modalPrice, max: price.maxPrice, date: price.date },
      ledger, forecast, absorption: Number(absorption.toFixed(2)), score: Math.round(score)
    };
  }).filter(Boolean);

  rows.sort((a, b) => b.score - a.score);
  return rows;
}

module.exports = { rankMarkets };
