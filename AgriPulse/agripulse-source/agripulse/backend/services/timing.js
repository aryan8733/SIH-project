const { netReturn } = require("./ledger");
const { STORAGE_PER_QTL_PER_DAY } = require("../config/constants");

/**
 * Sell now or hold? Compare net return today against net return at the forecast price,
 * minus what it costs to store the crop for those days.
 */
function sellNowOrWait({ forecast, quantityQtl, quality, distanceKm, vehicle, settings }) {
  const now = netReturn({ modalPrice: forecast.currentPrice, quantityQtl, quality, distanceKm, vehicle, settings });
  const later = netReturn({ modalPrice: forecast.predictedPrice, quantityQtl, quality, distanceKm, vehicle, settings });

  const gain = later.net - now.net;
  const storageCost = Math.round(STORAGE_PER_QTL_PER_DAY * quantityQtl * forecast.days);
  const netGain = gain - storageCost;

  let verdict, reason;
  if (netGain > quantityQtl * 30 && forecast.direction === "rising") {
    verdict = "wait";
    reason = `Prices are trending up. Holding ${forecast.days} days is worth about Rs ${gain}; after Rs ${storageCost} of storage you are still Rs ${netGain} ahead.`;
  } else if (netGain < -quantityQtl * 15) {
    verdict = "sell_now";
    reason = `The forecast is soft. Waiting ${forecast.days} days is likely to cost about Rs ${Math.abs(netGain)} once storage is counted.`;
  } else {
    verdict = "sell_now";
    reason = `The expected gain of Rs ${gain} barely covers Rs ${storageCost} of storage. Locking the price now removes the risk.`;
  }

  return {
    verdict, reason,
    netIfSoldToday: now.net,
    netAtForecastPrice: later.net,
    storageCost,
    netGainFromWaiting: netGain,
    forecast
  };
}

module.exports = { sellNowOrWait };
