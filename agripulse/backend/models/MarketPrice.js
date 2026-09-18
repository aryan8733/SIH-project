const mongoose = require("mongoose");

const marketPriceSchema = new mongoose.Schema({
  marketId: { type: mongoose.Schema.Types.ObjectId, ref: "Market", required: true, index: true },
  cropCode: { type: String, required: true, index: true },
  minPrice: Number,
  maxPrice: Number,
  modalPrice: { type: Number, required: true },       // "average"/modal price, the one farmers quote
  date: { type: Date, required: true, index: true },
  source: { type: String, enum: ["seed", "agmarknet", "enam", "manual"], default: "seed" }
}, { timestamps: true });

marketPriceSchema.index({ marketId: 1, cropCode: 1, date: -1 }, { unique: true });

module.exports = mongoose.model("MarketPrice", marketPriceSchema);
