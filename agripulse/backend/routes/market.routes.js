const router = require("express").Router();
const { protect, allow } = require("../middleware/auth");
const c = require("../controllers/market.controller");

router.get("/", protect, c.listMarkets);
router.post("/", protect, allow("admin"), c.createMarket);
router.patch("/:id", protect, allow("admin"), c.updateMarket);

module.exports = router;
