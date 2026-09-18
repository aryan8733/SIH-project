const mongoose = require("mongoose");

// A standing requirement a buyer posts. Drives the matching score and the demand signal.
const buyerDemandSchema = new mongoose.Schema({
  buyerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  cropCode: { type: String, required: true, index: true },
  quantityQtl: { type: Number, required: true },
  quality:  { type: String, enum: ["A", "B", "C"], default: "B" },
  expectedPrice: Number,
  validTill: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("BuyerDemand", buyerDemandSchema);
