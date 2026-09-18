const mongoose = require("mongoose");

const priceAlertSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  cropCode: { type: String, required: true },
  threshold: { type: Number, required: true },       // notify when modal price goes above this
  isActive: { type: Boolean, default: true },
  lastTriggeredAt: Date
}, { timestamps: true });

module.exports = mongoose.model("PriceAlert", priceAlertSchema);
