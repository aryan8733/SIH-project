// Vehicle catalogue used by the transport calculator.
// capacityQtl = how much one trip can carry, rateMultiplier = cost relative to the base per-km rate.
const VEHICLES = {
  tractor: { label: "Tractor trolley", capacityQtl: 12, rateMultiplier: 0.8 },
  pickup:  { label: "Pickup / Chhota hathi", capacityQtl: 25, rateMultiplier: 1.0 },
  truck:   { label: "6-tyre truck", capacityQtl: 90, rateMultiplier: 1.6 }
};

// Realised price as a fraction of the A-grade modal price.
const GRADE_FACTOR = { A: 1.0, B: 0.955, C: 0.9 };

// Storage + shrinkage cost per quintal per day when a farmer holds the crop back.
const STORAGE_PER_QTL_PER_DAY = 4;

const CROPS = [
  { code: "soybean", en: "Soybean", hi: "सोयाबीन", mr: "सोयाबीन", msp2026: 4892 },
  { code: "wheat",   en: "Wheat",   hi: "गेहूँ",   mr: "गहू",     msp2026: 2425 },
  { code: "onion",   en: "Onion",   hi: "प्याज",   mr: "कांदा",   msp2026: null },
  { code: "tomato",  en: "Tomato",  hi: "टमाटर",  mr: "टोमॅटो",  msp2026: null },
  { code: "cotton",  en: "Cotton",  hi: "कपास",   mr: "कापूस",   msp2026: 7521 }
];

module.exports = { VEHICLES, GRADE_FACTOR, STORAGE_PER_QTL_PER_DAY, CROPS };
