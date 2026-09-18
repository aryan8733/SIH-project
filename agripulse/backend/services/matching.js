const { netReturn } = require("./ledger");
const { roadDistanceKm } = require("./geo");
const { suggestVehicle } = require("./transport");

const GRADE_RANK = { A: 3, B: 2, C: 1 };

/**
 * Buyer match score out of 100. Every component is returned so the farmer can see
 * why a buyer scored what it did instead of trusting a black box.
 *   crop 35 | quantity fit 20 | grade 15 | distance 12 | price 10 | trust 8
 */
function matchBuyers({ buyers, cropCode, quantityQtl, quality, origin, bestMandiPrice, settings }) {
  const vehicle = suggestVehicle(quantityQtl);
  const candidates = buyers.filter(b => b.requiredCrops.includes(cropCode) && b.userId);
  // Price points are relative to the best offer on the table, not to an absolute number,
  // so the spread between buyers stays meaningful whatever the crop.
  const bestBuyerPrice = Math.max(1, ...candidates.map(b => b.expectedPrice || 0), bestMandiPrice || 0);

  return candidates
    .map(b => {
      const cropPoints = 35;

      const inRange = quantityQtl >= b.minQuantityQtl && quantityQtl <= b.maxQuantityQtl;
      const quantityPoints = inRange ? 20
        : quantityQtl < b.minQuantityQtl ? Math.max(0, 20 - (b.minQuantityQtl - quantityQtl) * 1.6)
        : 8;

      const gradeGap = (GRADE_RANK[b.qualityRequirement] ?? 2) - (GRADE_RANK[quality] ?? 3);
      const gradePoints = gradeGap <= 0 ? 15 : Math.max(0, 15 - gradeGap * 9);

      const distanceKm = roadDistanceKm(origin, b);
      const distancePoints = Math.max(0, 12 - distanceKm / 10);

      // A buyer paying 5% less than the best offer loses far more than 5% of the price points.
      const priceRatio = (b.expectedPrice || 0) / bestBuyerPrice;
      const pricePoints = Math.max(0, Math.min(10, 10 * Math.pow(priceRatio, 12)));

      const trustPoints = (b.verificationStatus === "verified" ? 5 : 0) + Math.max(0, (b.rating - 3.5) * 2);

      const score = Math.max(10, Math.min(98, Math.round(
        cropPoints + quantityPoints + gradePoints + distancePoints + pricePoints + trustPoints
      )));

      const ledger = netReturn({
        modalPrice: b.expectedPrice, quantityQtl, quality, distanceKm, vehicle, settings
      });

      return {
        buyerId: b.userId._id || b.userId,
        companyName: b.companyName,
        contactPerson: b.contactPerson,
        district: b.district,
        distanceKm,
        offeredPrice: b.expectedPrice,
        quantityRange: [b.minQuantityQtl, b.maxQuantityQtl],
        qualityRequirement: b.qualityRequirement,
        paymentTerms: b.paymentTerms,
        verificationStatus: b.verificationStatus,
        rating: b.rating,
        matchScore: score,
        netPerQtl: ledger.netPerQtl,
        scoreBreakdown: {
          crop: cropPoints,
          quantity: Math.round(quantityPoints),
          quality: Math.round(gradePoints),
          distance: Math.round(distancePoints),
          price: Math.round(pricePoints),
          trust: Math.round(trustPoints)
        }
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

module.exports = { matchBuyers };
