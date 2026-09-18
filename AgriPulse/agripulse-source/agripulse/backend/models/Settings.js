const mongoose = require("mongoose");

// A single document holding the rates the admin controls. Every net-return calculation reads it.
const settingsSchema = new mongoose.Schema({
  key: { type: String, default: "platform", unique: true },
  transportRatePerKm: { type: Number, default: 25 },
  chargeReturnTrip:   { type: Boolean, default: true },
  mandiFeePct:        { type: Number, default: 1.5 },
  commissionPct:      { type: Number, default: 1.0 },
  labourPerQtl:       { type: Number, default: 22 },
  packingPerQtl:      { type: Number, default: 18 },
  platformFeePct:     { type: Number, default: 1.0 }
}, { timestamps: true });

settingsSchema.statics.current = async function () {
  let s = await this.findOne({ key: "platform" });
  if (!s) s = await this.create({ key: "platform" });
  return s;
};

module.exports = mongoose.model("Settings", settingsSchema);
