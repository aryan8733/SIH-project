const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema({
  offerCode: { type: String, unique: true },
  lotId:    { type: mongoose.Schema.Types.ObjectId, ref: "CropLot", required: true, index: true },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  buyerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  offeredPrice: { type: Number, required: true },
  quantityQtl:  { type: Number, required: true },
  pickupDate:   Date,
  paymentTerms: String,
  status: { type: String, enum: ["Pending", "Negotiation", "Accepted", "Rejected", "Completed"], default: "Pending" },
  history: [{ by: String, price: Number, at: { type: Date, default: Date.now } }]
}, { timestamps: true });

offerSchema.pre("validate", async function (next) {
  if (this.offerCode) return next();
  const count = await mongoose.model("Offer").countDocuments();
  this.offerCode = "OF-" + (501 + count);
  next();
});

module.exports = mongoose.model("Offer", offerSchema);
