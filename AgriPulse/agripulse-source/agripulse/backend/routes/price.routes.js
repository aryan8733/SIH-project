const router = require("express").Router();
const { protect, allow } = require("../middleware/auth");
const c = require("../controllers/market.controller");

router.get("/", protect, c.latestPrices);
router.get("/history", protect, c.priceHistory);
router.post("/", protect, allow("admin"), c.upsertPrice);

module.exports = router;
