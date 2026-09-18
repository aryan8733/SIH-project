// ---------------------------------------------------------------------------
// DEMO DATA for AgriPulse. Everything here is synthetic and exists so the
// prototype can be demonstrated without a live Agmarknet / eNAM feed.
// Replace with real ingestion before production.
// ---------------------------------------------------------------------------

const MARKETS = [
  { name: "Dewas Krishi Upaj Mandi",  district: "Dewas",    lat: 22.9676, lng: 76.0534, demand: "Medium", arrivalsQtl: 1850, priceFactor: 0.965 },
  { name: "Indore Chhawni Mandi",     district: "Indore",   lat: 22.7196, lng: 75.8577, demand: "High",   arrivalsQtl: 6400, priceFactor: 0.985 },
  { name: "Ujjain Chimanganj Mandi",  district: "Ujjain",   lat: 23.1793, lng: 75.7849, demand: "High",   arrivalsQtl: 4100, priceFactor: 1.020 },
  { name: "Bhopal Karond Mandi",      district: "Bhopal",   lat: 23.2599, lng: 77.4126, demand: "High",   arrivalsQtl: 3200, priceFactor: 1.045 },
  { name: "Sehore Mandi",             district: "Sehore",   lat: 23.2020, lng: 77.0856, demand: "Medium", arrivalsQtl: 1500, priceFactor: 1.000 },
  { name: "Harda Mandi",              district: "Harda",    lat: 22.3441, lng: 77.0954, demand: "Medium", arrivalsQtl: 1300, priceFactor: 1.012 },
  { name: "Ratlam Mandi",             district: "Ratlam",   lat: 23.3315, lng: 75.0367, demand: "Low",    arrivalsQtl: 1100, priceFactor: 1.008 },
  { name: "Khandwa Mandi",            district: "Khandwa",  lat: 21.8257, lng: 76.3525, demand: "Medium", arrivalsQtl: 900,  priceFactor: 0.995 },
  { name: "Shajapur Mandi",           district: "Shajapur", lat: 23.4269, lng: 76.2733, demand: "Low",    arrivalsQtl: 800,  priceFactor: 0.978 },
  { name: "Ashta Mandi",              district: "Sehore",   lat: 23.0177, lng: 76.7221, demand: "Medium", arrivalsQtl: 1000, priceFactor: 0.990 }
];

const BASE_PRICE = { soybean: 4400, wheat: 2480, onion: 1650, tomato: 1250, cotton: 7250 };

const FARMERS = [
  { name: "Ramesh Patidar",   phone: "9826000001", village: "Bagli",       district: "Dewas",    lat: 22.6420, lng: 76.3480, land: 4.2, crops: ["soybean", "wheat"] },
  { name: "Sita Bai Yadav",   phone: "9826000002", village: "Tonk Khurd",  district: "Dewas",    lat: 22.9300, lng: 76.2500, land: 1.8, crops: ["onion", "wheat"] },
  { name: "Mangilal Chouhan", phone: "9826000003", village: "Sonkatch",    district: "Dewas",    lat: 22.9750, lng: 76.3300, land: 3.1, crops: ["wheat", "cotton"] },
  { name: "Anita Solanki",    phone: "9826000004", village: "Kannod",      district: "Dewas",    lat: 22.6670, lng: 76.7330, land: 2.4, crops: ["soybean"] },
  { name: "Jagdish Verma",    phone: "9826000005", village: "Hatpipliya",  district: "Dewas",    lat: 22.7500, lng: 76.4000, land: 5.0, crops: ["cotton", "onion"] },
  { name: "Kailash Rathore",  phone: "9826000006", village: "Khategaon",   district: "Dewas",    lat: 22.5930, lng: 76.9160, land: 2.0, crops: ["tomato"] },
  { name: "Pooja Malviya",    phone: "9826000007", village: "Ashta",       district: "Sehore",   lat: 23.0177, lng: 76.7221, land: 1.5, crops: ["onion"] },
  { name: "Devilal Sisodiya", phone: "9826000008", village: "Barot",       district: "Shajapur", lat: 23.3800, lng: 76.2600, land: 6.3, crops: ["soybean", "tomato"] },
  { name: "Sunita Jat",       phone: "9826000009", village: "Pipalrawan",  district: "Dewas",    lat: 22.8900, lng: 76.4800, land: 2.7, crops: ["wheat"] },
  { name: "Bherulal Gurjar",  phone: "9826000010", village: "Satwas",      district: "Dewas",    lat: 22.4900, lng: 76.8200, land: 3.6, crops: ["soybean", "wheat"] }
];

const BUYERS = [
  { company: "Sanchi Agro Processors",        person: "Nitin Agrawal", phone: "9826100001", district: "Ujjain",  lat: 23.1793, lng: 75.7849, crops: ["soybean", "wheat"],            min: 5,  max: 200, grade: "A", price: 4520, verified: true,  rating: 4.6, terms: "50% advance, rest in 2 days" },
  { company: "Malwa Oil Mills",               person: "Rakesh Jain",   phone: "9826100002", district: "Indore",  lat: 22.7196, lng: 75.8577, crops: ["soybean"],                     min: 10, max: 500, grade: "A", price: 4575, verified: true,  rating: 4.8, terms: "Full payment on pickup" },
  { company: "Narmada Foods Pvt Ltd",         person: "Sameer Khan",   phone: "9826100003", district: "Bhopal",  lat: 23.2599, lng: 77.4126, crops: ["wheat", "soybean"],            min: 20, max: 800, grade: "A", price: 4480, verified: true,  rating: 4.4, terms: "Payment in 7 days" },
  { company: "Chetak Traders",                person: "Om Prakash",    phone: "9826100004", district: "Dewas",   lat: 22.9676, lng: 76.0534, crops: ["soybean", "cotton"],           min: 5,  max: 120, grade: "B", price: 4390, verified: false, rating: 3.9, terms: "Cash on pickup" },
  { company: "Surya Onion Export",            person: "Deepak Shinde", phone: "9826100005", district: "Indore",  lat: 22.7196, lng: 75.8577, crops: ["onion"],                       min: 30, max: 900, grade: "A", price: 1780, verified: true,  rating: 4.5, terms: "Payment in 3 days" },
  { company: "FreshKart Retail",              person: "Aarti Mehra",   phone: "9826100006", district: "Indore",  lat: 22.7196, lng: 75.8577, crops: ["tomato", "onion"],             min: 5,  max: 80,  grade: "A", price: 1360, verified: true,  rating: 4.2, terms: "UPI on delivery" },
  { company: "Vindhya Cotton Ginning",        person: "Harish Patel",  phone: "9826100007", district: "Khandwa", lat: 21.8257, lng: 76.3525, crops: ["cotton"],                      min: 15, max: 400, grade: "A", price: 7480, verified: true,  rating: 4.3, terms: "Payment in 5 days" },
  { company: "Annapurna Flour Mill",          person: "Girish Soni",   phone: "9826100008", district: "Dewas",   lat: 22.9676, lng: 76.0534, crops: ["wheat"],                       min: 10, max: 300, grade: "B", price: 2530, verified: true,  rating: 4.1, terms: "Cash on pickup" },
  { company: "Agri FPO Sonkatch",             person: "Lokesh Verma",  phone: "9826100009", district: "Dewas",   lat: 22.9750, lng: 76.3300, crops: ["soybean", "wheat", "onion"],   min: 2,  max: 60,  grade: "B", price: 4430, verified: true,  rating: 4.7, terms: "Same-day UPI" },
  { company: "Shree Balaji Commission Agent", person: "Manoj Gupta",   phone: "9826100010", district: "Ujjain",  lat: 23.1793, lng: 75.7849, crops: ["soybean", "tomato"],           min: 5,  max: 150, grade: "C", price: 4260, verified: false, rating: 3.5, terms: "Payment in 10 days" }
];

// Deterministic RNG so every teammate seeds the same numbers.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 60 days of daily min / modal / max for one crop in one market. */
function buildSeries(cropCode, marketIndex, priceFactor, days = 60) {
  const base = BASE_PRICE[cropCode];
  const rnd = mulberry32(1000 + cropCode.length * 97 + marketIndex * 131);
  const drift = (rnd() - 0.42) * 0.9;
  let price = base * priceFactor * (0.94 + rnd() * 0.1);
  const rows = [];
  for (let d = days - 1; d >= 0; d--) {
    const seasonal = Math.sin((days - 1 - d) / 9) * base * 0.012;
    price = price + drift + seasonal * 0.35 + (rnd() - 0.5) * base * 0.014;
    const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - d);
    const modal = Math.round(price);
    rows.push({ date, modalPrice: modal, minPrice: Math.round(modal * 0.955), maxPrice: Math.round(modal * 1.05) });
  }
  return rows;
}

module.exports = { MARKETS, BASE_PRICE, FARMERS, BUYERS, buildSeries };
