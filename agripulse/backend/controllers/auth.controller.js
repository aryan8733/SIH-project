const jwt = require("jsonwebtoken");
const User = require("../models/User");
const FarmerProfile = require("../models/FarmerProfile");
const BuyerProfile = require("../models/BuyerProfile");

const signToken = user =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });

const publicUser = u => ({
  id: u._id, name: u.name, phone: u.phone, role: u.role, language: u.language, location: u.location
});

// POST /api/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, phone, password, role, language, village, district, state, lat, lng,
            companyName, contactPerson, gstin, requiredCrops, minQuantityQtl, maxQuantityQtl,
            qualityRequirement, expectedPrice, landHectares } = req.body;

    if (await User.findOne({ phone }))
      return res.status(409).json({ success: false, message: "This mobile number is already registered." });

    const user = await User.create({
      name, phone, password, role, language: language || "hi",
      location: { village, district, state, lat, lng }
    });

    if (role === "farmer") {
      await FarmerProfile.create({ userId: user._id, village, district, state, landHectares });
    } else if (role === "buyer") {
      await BuyerProfile.create({
        userId: user._id, companyName, contactPerson: contactPerson || name, gstin, district, lat, lng,
        requiredCrops: requiredCrops || [], minQuantityQtl, maxQuantityQtl,
        qualityRequirement, expectedPrice, verificationStatus: "pending"
      });
    }

    res.status(201).json({ success: true, token: signToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
};

// POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone }).select("+password");
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ success: false, message: "Mobile number or password is wrong." });
    if (!user.isActive)
      return res.status(403).json({ success: false, message: "This account is disabled." });

    res.json({ success: true, token: signToken(user), user: publicUser(user) });
  } catch (err) { next(err); }
};

// GET /api/auth/me
exports.me = async (req, res, next) => {
  try {
    const profile = req.user.role === "farmer"
      ? await FarmerProfile.findOne({ userId: req.user._id })
      : req.user.role === "buyer"
      ? await BuyerProfile.findOne({ userId: req.user._id })
      : null;
    res.json({ success: true, user: publicUser(req.user), profile });
  } catch (err) { next(err); }
};

// PATCH /api/auth/me
exports.updateMe = async (req, res, next) => {
  try {
    const allowed = ["name", "language", "email"];
    allowed.forEach(k => { if (req.body[k] !== undefined) req.user[k] = req.body[k]; });
    if (req.body.location) req.user.location = { ...req.user.location.toObject(), ...req.body.location };
    await req.user.save();
    res.json({ success: true, user: publicUser(req.user) });
  } catch (err) { next(err); }
};
