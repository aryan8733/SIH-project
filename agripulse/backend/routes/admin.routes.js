const router = require("express").Router();
const { protect, allow } = require("../middleware/auth");
const c = require("../controllers/admin.controller");

router.post("/complaints", protect, c.raiseComplaint);   // any signed-in user

router.use(protect, allow("admin"));
router.get("/farmers", c.farmers);
router.get("/buyers", c.buyers);
router.patch("/buyers/:id/verify", c.verifyBuyer);
router.get("/settings", c.getSettings);
router.patch("/settings", c.updateSettings);
router.get("/analytics", c.analytics);
router.get("/complaints", c.complaints);
router.patch("/complaints/:id", c.updateComplaint);

module.exports = router;
