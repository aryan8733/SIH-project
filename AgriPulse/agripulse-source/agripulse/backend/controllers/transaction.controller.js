const Transaction = require("../models/Transaction");

// GET /api/transactions
exports.list = async (req, res, next) => {
  try {
    const filter = req.user.role === "admin" ? {}
      : req.user.role === "buyer" ? { buyerId: req.user._id }
      : { farmerId: req.user._id };

    const rows = await Transaction.find(filter)
      .populate("farmerId", "name")
      .populate("buyerId", "name")
      .populate("lotId", "lotCode")
      .sort({ date: -1 });

    const totalValue = rows.reduce((a, t) => a + (t.totalValue || 0), 0);
    res.json({ success: true, count: rows.length, totalValue, data: rows });
  } catch (err) { next(err); }
};
