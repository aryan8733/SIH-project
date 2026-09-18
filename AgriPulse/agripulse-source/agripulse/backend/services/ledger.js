const { GRADE_FACTOR } = require("../config/constants");
const { transportCost } = require("./transport");

/**
 * The heart of the product: turn a headline price into the rupees a farmer actually keeps.
 * Net return = revenue - transport - mandi fee - commission - labour - packing
 */
function netReturn({ modalPrice, quantityQtl, quality = "A", distanceKm, vehicle, settings }) {
  const gradeFactor = GRADE_FACTOR[quality] ?? 1;
  const effectivePrice = modalPrice * gradeFactor;
  const revenue = effectivePrice * quantityQtl;

  const transport = transportCost({ distanceKm, quantityQtl, vehicle, settings });
  const mandiFee = (revenue * settings.mandiFeePct) / 100;
  const commission = (revenue * settings.commissionPct) / 100;
  const labour = settings.labourPerQtl * quantityQtl;
  const packing = settings.packingPerQtl * quantityQtl;

  const totalCost = transport.total + mandiFee + commission + labour + packing;
  const net = revenue - totalCost;

  return {
    modalPrice: Math.round(modalPrice),
    gradeFactor,
    effectivePrice: Math.round(effectivePrice),
    quantityQtl,
    revenue: Math.round(revenue),
    breakdown: {
      transport: transport.total,
      mandiFee: Math.round(mandiFee),
      commission: Math.round(commission),
      labour: Math.round(labour),
      packing: Math.round(packing)
    },
    transport,
    totalCost: Math.round(totalCost),
    net: Math.round(net),
    netPerQtl: Math.round(net / Math.max(quantityQtl, 1))
  };
}

module.exports = { netReturn };
