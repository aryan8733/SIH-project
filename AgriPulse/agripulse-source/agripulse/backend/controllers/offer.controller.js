const Offer = require("../models/Offer");
const CropLot = require("../models/CropLot");
const Transaction = require("../models/Transaction");
const Settings = require("../models/Settings");

// POST /api/offers  (buyer)
exports.create = async (req, res, next) => {
  try {
    const { lotId, offeredPrice, quantityQtl, pickupDate, paymentTerms } = req.body;
    const lot = await CropLot.findById(lotId);
    if (!lot) return res.status(404).json({ success: false, message: "Lot not found." });
    if (lot.status === "Sold") return res.status(409).json({ success: false, message: "This lot is already sold." });
    if (quantityQtl > lot.quantityQtl)
      return res.status(422).json({ success: false, message: `Lot has only ${lot.quantityQtl} quintal.` });

    const offer = await Offer.create({
      lotId, farmerId: lot.farmerId, buyerId: req.user._id,
      offeredPrice, quantityQtl, pickupDate, paymentTerms,
      history: [{ by: "buyer", price: offeredPrice }]
    });
    res.status(201).json({ success: true, data: offer });
  } catch (err) { next(err); }
};

// GET /api/offers  (farmer sees offers on their lots, buyer sees their own)
exports.list = async (req, res, next) => {
  try {
    const filter = req.user.role === "buyer" ? { buyerId: req.user._id } : { farmerId: req.user._id };
    const offers = await Offer.find(filter)
      .populate("lotId", "lotCode cropCode quantityQtl quality status")
      .populate("buyerId", "name")
      .populate("farmerId", "name")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: offers.length, data: offers });
  } catch (err) { next(err); }
};

// PATCH /api/offers/:id/accept  (farmer) -> closes the lot and writes a transaction
exports.accept = async (req, res, next) => {
  try {
    const offer = await Offer.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!offer) return res.status(404).json({ success: false, message: "Offer not found." });
    if (["Completed", "Rejected"].includes(offer.status))
      return res.status(409).json({ success: false, message: `Offer is already ${offer.status.toLowerCase()}.` });

    const settings = await Settings.current();
    const lot = await CropLot.findById(offer.lotId);

    offer.status = "Completed";
    await offer.save();
    lot.status = "Sold";
    await lot.save();
    await Offer.updateMany(
      { lotId: lot._id, _id: { $ne: offer._id }, status: { $in: ["Pending", "Negotiation"] } },
      { status: "Rejected" }
    );

    const totalValue = offer.offeredPrice * offer.quantityQtl;
    const txn = await Transaction.create({
      lotId: lot._id, offerId: offer._id, farmerId: offer.farmerId, buyerId: offer.buyerId,
      cropCode: lot.cropCode, quantityQtl: offer.quantityQtl, finalPrice: offer.offeredPrice,
      totalValue, platformFee: Math.round((totalValue * settings.platformFeePct) / 100)
    });

    res.json({ success: true, message: "Offer accepted and sale recorded.", offer, transaction: txn });
  } catch (err) { next(err); }
};

// PATCH /api/offers/:id/reject  (farmer)
exports.reject = async (req, res, next) => {
  try {
    const offer = await Offer.findOneAndUpdate(
      { _id: req.params.id, farmerId: req.user._id, status: { $in: ["Pending", "Negotiation"] } },
      { status: "Rejected" }, { new: true });
    if (!offer) return res.status(404).json({ success: false, message: "Offer not found or already closed." });
    res.json({ success: true, data: offer });
  } catch (err) { next(err); }
};

// PATCH /api/offers/:id/counter  (farmer proposes a different price)
exports.counter = async (req, res, next) => {
  try {
    const { price } = req.body;
    const offer = await Offer.findOne({ _id: req.params.id, farmerId: req.user._id });
    if (!offer) return res.status(404).json({ success: false, message: "Offer not found." });
    offer.offeredPrice = price;
    offer.status = "Negotiation";
    offer.history.push({ by: "farmer", price });
    await offer.save();
    await CropLot.findByIdAndUpdate(offer.lotId, { status: "Negotiation" });
    res.json({ success: true, data: offer });
  } catch (err) { next(err); }
};
