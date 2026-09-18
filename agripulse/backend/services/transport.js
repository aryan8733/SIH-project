const { VEHICLES } = require("../config/constants");

/**
 * Cost of moving a lot to a market.
 * Trips matter: 30 quintal on a 12-quintal trolley is three trips, not one.
 */
function transportCost({ distanceKm, quantityQtl, vehicle = "pickup", settings }) {
  const v = VEHICLES[vehicle] || VEHICLES.pickup;
  const trips = Math.max(1, Math.ceil(quantityQtl / v.capacityQtl));
  const billedKm = settings.chargeReturnTrip ? distanceKm * 2 : distanceKm;
  const total = billedKm * settings.transportRatePerKm * v.rateMultiplier * trips;
  return {
    vehicle, label: v.label, capacityQtl: v.capacityQtl,
    trips, distanceKm, billedKm,
    ratePerKm: settings.transportRatePerKm,
    total: Math.round(total),
    perQtl: Math.round(total / Math.max(quantityQtl, 1))
  };
}

function suggestVehicle(quantityQtl) {
  if (quantityQtl <= VEHICLES.tractor.capacityQtl) return "tractor";
  if (quantityQtl <= VEHICLES.pickup.capacityQtl) return "pickup";
  return "truck";
}

module.exports = { transportCost, suggestVehicle };
