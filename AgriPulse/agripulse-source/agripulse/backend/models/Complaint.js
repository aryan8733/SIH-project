const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  against:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  txnId:    { type: mongoose.Schema.Types.ObjectId, ref: "Transaction" },
  text:     { type: String, required: true },
  status:   { type: String, enum: ["Open", "Under review", "Closed"], default: "Open" }
}, { timestamps: true });

module.exports = mongoose.model("Complaint", complaintSchema);
