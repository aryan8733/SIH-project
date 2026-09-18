const CropLot = require("../models/CropLot");
const Crop = require("../models/Crop");
const Offer = require("../models/Offer");

// POST /api/lots  (farmer publishes a lot)
exports.create = async (req, res, next) => {
  try {
    const { cropId, cropCode, quantityQtl, quality, pickupLocation, askingPrice } = req.body;
    const lot = await CropLot.create({
      farmerId: req.user._id, cropId, cropCode, quantityQtl, quality,
      pickupLocation: pickupLocation || req.user.location?.village,
      lat: req.user.location?.lat, lng: req.user.location?.lng,
      askingPrice
    });
    if (cropId) await Crop.findByIdAndUpdate(cropId, { status: "Listed" });
    res.status(201).json({ success: true, data: lot });
  } catch (err) { next(err); }
};

// GET /api/lots/mine  (farmer, with the offers on each lot)
exports.mine = async (req, res, next) => {
  try {
    const lots = await CropLot.find({ farmerId: req.user._id }).sort({ createdAt: -1 }).lean();
    const withOffers = await Promise.all(lots.map(async l => ({
      ...l,
      offers: await Offer.find({ lotId: l._id }).populate("buyerId", "name").sort({ createdAt: -1 }).lean()
    })));
    res.json({ success: true, count: withOffers.length, data: withOffers });
  } catch (err) { next(err); }
};

// GET /api/lots/available?crop=soybean  (buyer marketplace)
exports.available = async (req, res, next) => {
  try {
    const filter = { status: { $in: ["Available", "Negotiation"] } };
    if (req.query.crop) filter.cropCode = req.query.crop;
    if (req.query.minQty) filter.quantityQtl = { $gte: Number(req.query.minQty) };
    if (req.query.quality) filter.quality = req.query.quality;

    const lots = await CropLot.find(filter)
      .populate("farmerId", "name location")
      .sort({ createdAt: -1 }).limit(100).lean();

    res.json({ success: true, count: lots.length, data: lots });
  } catch (err) { next(err); }
};

// PATCH /api/lots/:id
exports.update = async (req, res, next) => {
  try {
    const lot = await CropLot.findOneAndUpdate({ _id: req.params.id, farmerId: req.user._id }, req.body, { new: true });
    if (!lot) return res.status(404).json({ success: false, message: "Lot not found." });
    res.json({ success: true, data: lot });
  } catch (err) { next(err); }
};
