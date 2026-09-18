const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  phone:    { type: String, required: true, unique: true, match: [/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"] },
  email:    { type: String, lowercase: true, trim: true, sparse: true },
  password: { type: String, required: true, minlength: 8, select: false },
  role:     { type: String, enum: ["farmer", "buyer", "admin"], required: true },
  language: { type: String, enum: ["en", "hi", "mr"], default: "hi" },
  location: {
    village: String, district: String, state: { type: String, default: "Madhya Pradesh" },
    lat: Number, lng: Number
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);
