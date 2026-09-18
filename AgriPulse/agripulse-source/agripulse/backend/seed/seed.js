/**
 * Seeds the database with demo data.
 *   npm run seed            wipes and reseeds
 * Every record created here is DEMO DATA.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");

const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const BuyerProfile = require("../models/BuyerProfile");
const BuyerDemand = require("../models/BuyerDemand");
const Crop = require("../models/Crop");
const Market = require("../models/Market");
const MarketPrice = require("../models/MarketPrice");
const CropLot = require("../models/CropLot");
const Offer = require("../models/Offer");
const Transaction = require("../models/Transaction");
const PriceAlert = require("../models/PriceAlert");
const Complaint = require("../models/Complaint");
const Settings = require("../models/Settings");

const { MARKETS, BASE_PRICE, FARMERS, BUYERS, buildSeries } = require("./data");

const DEMO_PASSWORD = "demo1234";

async function run() {
  await connectDB();
  console.log("Clearing old data...");
  await Promise.all([
    User.deleteMany({}), FarmerProfile.deleteMany({}), BuyerProfile.deleteMany({}), BuyerDemand.deleteMany({}),
    Crop.deleteMany({}), Market.deleteMany({}), MarketPrice.deleteMany({}), CropLot.deleteMany({}),
    Offer.deleteMany({}), Transaction.deleteMany({}), PriceAlert.deleteMany({}), Complaint.deleteMany({}),
    Settings.deleteMany({})
  ]);

  await Settings.create({ key: "platform" });

  // --- admin ---
  const admin = await User.create({
    name: "Platform Admin", phone: "9000000000", password: DEMO_PASSWORD, role: "admin", language: "en",
    location: { district: "Indore", state: "Madhya Pradesh", lat: 22.7196, lng: 75.8577 }
  });

  // --- markets ---
  const markets = await Market.insertMany(MARKETS.map(m => ({
    name: m.name, district: m.district, state: "Madhya Pradesh",
    lat: m.lat, lng: m.lng, demand: m.demand, arrivalsQtl: m.arrivalsQtl
  })));
  console.log(`Markets: ${markets.length}`);

  // --- 60 days of prices for every crop in every market ---
  const priceDocs = [];
  Object.keys(BASE_PRICE).forEach(cropCode => {
    markets.forEach((market, i) => {
      buildSeries(cropCode, i, MARKETS[i].priceFactor).forEach(row => {
        priceDocs.push({ marketId: market._id, cropCode, source: "seed", ...row });
      });
    });
  });
  await MarketPrice.insertMany(priceDocs);
  console.log(`Price records: ${priceDocs.length}`);

  // --- farmers ---
  const farmerUsers = [];
  for (const f of FARMERS) {
    const u = await User.create({
      name: f.name, phone: f.phone, password: DEMO_PASSWORD, role: "farmer", language: "hi",
      location: { village: f.village, district: f.district, state: "Madhya Pradesh", lat: f.lat, lng: f.lng }
    });
    await FarmerProfile.create({
      userId: u._id, village: f.village, district: f.district, landHectares: f.land, primaryCrops: f.crops
    });
    farmerUsers.push(u);
  }
  console.log(`Farmers: ${farmerUsers.length}`);

  // --- buyers + their standing demand ---
  const buyerUsers = [];
  for (const b of BUYERS) {
    const u = await User.create({
      name: b.company, phone: b.phone, password: DEMO_PASSWORD, role: "buyer", language: "en",
      location: { district: b.district, state: "Madhya Pradesh", lat: b.lat, lng: b.lng }
    });
    await BuyerProfile.create({
      userId: u._id, companyName: b.company, contactPerson: b.person, district: b.district,
      lat: b.lat, lng: b.lng, requiredCrops: b.crops, minQuantityQtl: b.min, maxQuantityQtl: b.max,
      qualityRequirement: b.grade, expectedPrice: b.price, paymentTerms: b.terms,
      verificationStatus: b.verified ? "verified" : "pending", rating: b.rating
    });
    for (const crop of b.crops) {
      await BuyerDemand.create({
        buyerId: u._id, cropCode: crop, quantityQtl: b.max, quality: b.grade, expectedPrice: b.price
      });
    }
    buyerUsers.push(u);
  }
  console.log(`Buyers: ${buyerUsers.length}, buyer demand records: ${await BuyerDemand.countDocuments()}`);

  // --- crops held by farmers ---
  const crops = await Crop.insertMany([
    { farmerId: farmerUsers[0]._id, cropCode: "soybean", quantityQtl: 10, quality: "A", expectedPrice: 4500, status: "Ready" },
    { farmerId: farmerUsers[0]._id, cropCode: "wheat",   quantityQtl: 25, quality: "A", expectedPrice: 2550, status: "Stored" },
    { farmerId: farmerUsers[1]._id, cropCode: "onion",   quantityQtl: 40, quality: "B", expectedPrice: 1700, status: "Ready" }
  ]);

  // --- crop lots ---
  const lotSpec = [
    [0, "soybean", 10, "A", "Bagli",      4500, "Available"],
    [1, "onion",   40, "B", "Tonk Khurd", 1700, "Available"],
    [2, "wheat",   55, "A", "Sonkatch",   2560, "Negotiation"],
    [3, "soybean", 18, "A", "Kannod",     4560, "Available"],
    [4, "cotton",  32, "A", "Hatpipliya", 7400, "Available"],
    [5, "tomato",  12, "B", "Khategaon",  1290, "Sold"],
    [6, "onion",   26, "A", "Ashta",      1760, "Available"],
    [7, "soybean", 75, "A", "Barot",      4520, "Available"],
    [8, "wheat",   30, "B", "Pipalrawan", 2480, "Available"],
    [9, "soybean", 22, "B", "Satwas",     4380, "Sold"],
    [2, "cotton",  45, "A", "Sonkatch",   7450, "Available"],
    [4, "onion",   60, "C", "Hatpipliya", 1520, "Available"],
    [1, "wheat",   20, "A", "Tonk Khurd", 2540, "Available"],
    [7, "tomato",  15, "A", "Barot",      1340, "Negotiation"],
    [9, "wheat",   48, "A", "Satwas",     2570, "Available"]
  ];
  const lots = [];
  for (const [fi, cropCode, qty, quality, place, ask, status] of lotSpec) {
    const f = farmerUsers[fi];
    lots.push(await CropLot.create({
      farmerId: f._id, cropCode, quantityQtl: qty, quality, pickupLocation: place,
      lat: f.location.lat, lng: f.location.lng, askingPrice: ask, status,
      cropId: fi === 0 && cropCode === "soybean" ? crops[0]._id : undefined
    }));
  }
  console.log(`Crop lots: ${lots.length}`);

  // --- offers ---
  const offerSpec = [
    [0,  1, 4560, 10, "Pending"],
    [0,  8, 4495, 10, "Pending"],
    [2,  7, 2515, 55, "Negotiation"],
    [4,  6, 7440, 32, "Pending"],
    [6,  4, 1745, 26, "Pending"],
    [5,  5, 1300, 12, "Completed"],
    [9,  3, 4400, 22, "Completed"],
    [7,  0, 4535, 60, "Pending"],
    [13, 5, 1320, 15, "Negotiation"],
    [10, 6, 7420, 45, "Rejected"]
  ];
  const offers = [];
  for (const [li, bi, price, qty, status] of offerSpec) {
    offers.push(await Offer.create({
      lotId: lots[li]._id, farmerId: lots[li].farmerId, buyerId: buyerUsers[bi]._id,
      offeredPrice: price, quantityQtl: qty, paymentTerms: BUYERS[bi].terms, status,
      pickupDate: new Date(Date.now() + 4 * 864e5),
      history: [{ by: "buyer", price }]
    }));
  }
  console.log(`Offers: ${offers.length}`);

  // --- transactions from the completed offers ---
  const settings = await Settings.current();
  for (const o of offers.filter(x => x.status === "Completed")) {
    const lot = lots.find(l => String(l._id) === String(o.lotId));
    const totalValue = o.offeredPrice * o.quantityQtl;
    await Transaction.create({
      lotId: lot._id, offerId: o._id, farmerId: o.farmerId, buyerId: o.buyerId,
      cropCode: lot.cropCode, quantityQtl: o.quantityQtl, finalPrice: o.offeredPrice,
      totalValue, platformFee: Math.round(totalValue * settings.platformFeePct / 100)
    });
  }

  // --- alerts and complaints ---
  await PriceAlert.insertMany([
    { farmerId: farmerUsers[0]._id, cropCode: "soybean", threshold: 4500 },
    { farmerId: farmerUsers[0]._id, cropCode: "wheat",   threshold: 2600 },
    { farmerId: farmerUsers[1]._id, cropCode: "onion",   threshold: 1800 }
  ]);
  await Complaint.insertMany([
    { raisedBy: farmerUsers[0]._id, against: buyerUsers[9]._id, text: "Payment delayed beyond the agreed 10 days.", status: "Open" },
    { raisedBy: farmerUsers[6]._id, against: buyerUsers[3]._id, text: "Weight deducted without a written reason.", status: "Under review" }
  ]);

  console.log(`
Seeding complete.

  Admin   9000000000 / ${DEMO_PASSWORD}
  Farmer  9826000001 / ${DEMO_PASSWORD}   (Ramesh Patidar, Bagli, Dewas)
  Buyer   9826100002 / ${DEMO_PASSWORD}   (Malwa Oil Mills, Indore)
`);
  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
