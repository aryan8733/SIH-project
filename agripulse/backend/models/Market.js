const mongoose = require("mongoose");

const marketSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  district: { type: String, required: true },
  state:    { type: String, default: "Madhya Pradesh" },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  demand:   { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
  arrivalsQtl: { type: Number, default: 1000 },       // today's arrivals, used as a liquidity signal
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

marketSchema.index({ district: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("Market", marketSchema);
