const mongoose = require("mongoose");

// A crop the farmer has in hand or expects. Becomes a CropLot once published to buyers.
const cropSchema = new mongoose.Schema({
  farmerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  cropCode:  { type: String, required: true },          // soybean | wheat | onion | tomato | cotton
  quantityQtl: { type: Number, required: true, min: 0.1 },
  quality:   { type: String, enum: ["A", "B", "C"], default: "A" },
  harvestDate: Date,
  expectedSellingDate: Date,
  expectedPrice: Number,
  status: { type: String, enum: ["Ready", "Stored", "Listed", "Sold"], default: "Ready" }
}, { timestamps: true });

module.exports = mongoose.model("Crop", cropSchema);
