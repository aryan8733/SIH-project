const User = require("../models/User");
const BuyerProfile = require("../models/BuyerProfile");
const FarmerProfile = require("../models/FarmerProfile");
const CropLot = require("../models/CropLot");
const Offer = require("../models/Offer");
const Transaction = require("../models/Transaction");
const Complaint = require("../models/Complaint");
const Settings = require("../models/Settings");

exports.farmers = async (req, res, next) => {
  try {
    const users = await User.find({ role: "farmer" }).lean();
    const data = await Promise.all(users.map(async u => ({
      ...u,
      profile: await FarmerProfile.findOne({ userId: u._id }).lean(),
      lots: await CropLot.countDocuments({ farmerId: u._id }),
      sales: await Transaction.countDocuments({ farmerId: u._id })
    })));
    res.json({ success: true, count: data.length, data });
  } catch (err) { next(err); }
};

exports.buyers = async (req, res, next) => {
  try {
    const data = await BuyerProfile.find().populate("userId", "name phone isActive").lean();
    res.json({ success: true, count: data.length, data });
  } catch (err) { next(err); }
};

// PATCH /api/admin/buyers/:id/verify   body: { status: "verified" | "rejected" | "pending" }
exports.verifyBuyer = async (req, res, next) => {
  try {
    const profile = await BuyerProfile.findOneAndUpdate(
      { userId: req.params.id },
      { verificationStatus: req.body.status || "verified" },
      { new: true });
    if (!profile) return res.status(404).json({ success: false, message: "Buyer profile not found." });
    res.json({ success: true, data: profile });
  } catch (err) { next(err); }
};

exports.getSettings = async (req, res, next) => {
  try { res.json({ success: true, data: await Settings.current() }); }
  catch (err) { next(err); }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const s = await Settings.current();
    ["transportRatePerKm", "chargeReturnTrip", "mandiFeePct", "commissionPct",
     "labourPerQtl", "packingPerQtl", "platformFeePct"].forEach(k => {
      if (req.body[k] !== undefined) s[k] = req.body[k];
    });
    await s.save();
    res.json({ success: true, data: s });
  } catch (err) { next(err); }
};

exports.analytics = async (req, res, next) => {
  try {
    const [farmers, buyers, verifiedBuyers, openLots] = await Promise.all([
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "buyer" }),
      BuyerProfile.countDocuments({ verificationStatus: "verified" }),
      CropLot.countDocuments({ status: "Available" })
    ]);

    const valueAgg = await Transaction.aggregate([
      { $group: { _id: null, totalValue: { $sum: "$totalValue" }, fee: { $sum: "$platformFee" }, deals: { $sum: 1 } } }
    ]);
    const byCrop = await Transaction.aggregate([
      { $group: { _id: "$cropCode", value: { $sum: "$totalValue" }, qty: { $sum: "$quantityQtl" } } },
      { $sort: { value: -1 } }
    ]);
    const offerFunnel = await Offer.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]);
    const listedByCrop = await CropLot.aggregate([
      { $group: { _id: "$cropCode", qty: { $sum: "$quantityQtl" }, lots: { $sum: 1 } } }, { $sort: { qty: -1 } }
    ]);

    res.json({
      success: true,
      totals: {
        farmers, buyers, verifiedBuyers, openLots,
        deals: valueAgg[0]?.deals || 0,
        transactionValue: valueAgg[0]?.totalValue || 0,
        platformRevenue: valueAgg[0]?.fee || 0
      },
      byCrop, offerFunnel, listedByCrop
    });
  } catch (err) { next(err); }
};

exports.complaints = async (req, res, next) => {
  try {
    const data = await Complaint.find().populate("raisedBy", "name").populate("against", "name").sort({ createdAt: -1 });
    res.json({ success: true, count: data.length, data });
  } catch (err) { next(err); }
};

exports.updateComplaint = async (req, res, next) => {
  try {
    const c = await Complaint.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!c) return res.status(404).json({ success: false, message: "Complaint not found." });
    res.json({ success: true, data: c });
  } catch (err) { next(err); }
};

// Any signed-in user can raise a complaint
exports.raiseComplaint = async (req, res, next) => {
  try {
    const c = await Complaint.create({ raisedBy: req.user._id, against: req.body.against, txnId: req.body.txnId, text: req.body.text });
    res.status(201).json({ success: true, data: c });
  } catch (err) { next(err); }
};
