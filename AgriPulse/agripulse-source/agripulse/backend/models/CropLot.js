const mongoose = require("mongoose");

const cropLotSchema = new mongoose.Schema({
  lotCode:  { type: String, unique: true },            // LOT-10245
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  cropId:   { type: mongoose.Schema.Types.ObjectId, ref: "Crop" },
  cropCode: { type: String, required: true },
  quantityQtl: { type: Number, required: true },
  quality:  { type: String, enum: ["A", "B", "C"], default: "A" },
  pickupLocation: String,
  lat: Number,
  lng: Number,
  askingPrice: Number,
  status: { type: String, enum: ["Available", "Negotiation", "Sold", "Withdrawn"], default: "Available", index: true }
}, { timestamps: true });

cropLotSchema.pre("validate", async function (next) {
  if (this.lotCode) return next();
  const count = await mongoose.model("CropLot").countDocuments();
  this.lotCode = "LOT-" + (10245 + count);
  next();
});

module.exports = mongoose.model("CropLot", cropLotSchema);
