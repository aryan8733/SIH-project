const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, allow } = require("../middleware/auth");
const c = require("../controllers/offer.controller");

router.get("/", protect, c.list);
router.post("/", protect, allow("buyer"), [
  body("lotId").notEmpty().withMessage("lotId is required"),
  body("offeredPrice").isFloat({ min: 1 }).withMessage("Offered price is required"),
  body("quantityQtl").isFloat({ min: 0.1 }).withMessage("Quantity is required")
], validate, c.create);
router.patch("/:id/accept", protect, allow("farmer"), c.accept);
router.patch("/:id/reject", protect, allow("farmer"), c.reject);
router.patch("/:id/counter", protect, allow("farmer"), [
  body("price").isFloat({ min: 1 }).withMessage("Counter price is required")
], validate, c.counter);

module.exports = router;
