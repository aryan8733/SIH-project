const Crop = require("../models/Crop");

// GET /api/crops
exports.list = async (req, res, next) => {
  try { res.json({ success: true, data: await Crop.find({ farmerId: req.user._id }).sort({ createdAt: -1 }) }); }
  catch (err) { next(err); }
};

// POST /api/crops
exports.create = async (req, res, next) => {
  try {
    const crop = await Crop.create({ ...req.body, farmerId: req.user._id });
    res.status(201).json({ success: true, data: crop });
  } catch (err) { next(err); }
};

// PATCH /api/crops/:id
exports.update = async (req, res, next) => {
  try {
    const crop = await Crop.findOneAndUpdate({ _id: req.params.id, farmerId: req.user._id }, req.body, { new: true });
    if (!crop) return res.status(404).json({ success: false, message: "Crop not found." });
    res.json({ success: true, data: crop });
  } catch (err) { next(err); }
};

// DELETE /api/crops/:id
exports.remove = async (req, res, next) => {
  try {
    const crop = await Crop.findOneAndDelete({ _id: req.params.id, farmerId: req.user._id });
    if (!crop) return res.status(404).json({ success: false, message: "Crop not found." });
    res.json({ success: true, message: "Crop deleted." });
  } catch (err) { next(err); }
};
