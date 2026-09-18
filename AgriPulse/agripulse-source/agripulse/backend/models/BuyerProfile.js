const mongoose = require("mongoose");

const buyerProfileSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  companyName: { type: String, required: true },
  contactPerson: String,
  gstin:       String,
  district:    String,
  lat: Number,
  lng: Number,
  requiredCrops:   [{ type: String }],
  minQuantityQtl:  { type: Number, default: 1 },
  maxQuantityQtl:  { type: Number, default: 1000 },
  qualityRequirement: { type: String, enum: ["A", "B", "C"], default: "B" },
  expectedPrice:   { type: Number, default: 0 },   // rupees per quintal the buyer is ready to pay
  paymentTerms:    { type: String, default: "Full payment on pickup" },
  verificationStatus: { type: String, enum: ["pending", "verified", "rejected"], default: "pending" },
  rating: { type: Number, default: 4.0, min: 0, max: 5 }
}, { timestamps: true });

module.exports = mongoose.model("BuyerProfile", buyerProfileSchema);
