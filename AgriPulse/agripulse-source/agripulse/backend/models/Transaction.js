const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  txnCode:  { type: String, unique: true },
  lotId:    { type: mongoose.Schema.Types.ObjectId, ref: "CropLot", required: true },
  offerId:  { type: mongoose.Schema.Types.ObjectId, ref: "Offer" },
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  buyerId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  cropCode: String,
  quantityQtl: Number,
  finalPrice: Number,                 // rupees per quintal
  totalValue: Number,
  platformFee: Number,                // charged to the buyer
  status: { type: String, enum: ["Completed", "Cancelled", "Disputed"], default: "Completed" },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

transactionSchema.pre("validate", async function (next) {
  if (this.txnCode) return next();
  const count = await mongoose.model("Transaction").countDocuments();
  this.txnCode = "TX-" + (9001 + count);
  next();
});

module.exports = mongoose.model("Transaction", transactionSchema);
