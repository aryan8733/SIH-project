const mongoose = require("mongoose");

const farmerProfileSchema = new mongoose.Schema({
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  village:  String,
  district: String,
  state:    { type: String, default: "Madhya Pradesh" },
  landHectares: Number,
  primaryCrops: [String],
  preferredVehicle: { type: String, enum: ["tractor", "pickup", "truck"], default: "tractor" }
}, { timestamps: true });

module.exports = mongoose.model("FarmerProfile", farmerProfileSchema);
