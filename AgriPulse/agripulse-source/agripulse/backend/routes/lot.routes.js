const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, allow } = require("../middleware/auth");
const c = require("../controllers/lot.controller");

router.get("/available", protect, c.available);
router.get("/mine", protect, allow("farmer"), c.mine);
router.post("/", protect, allow("farmer"), [
  body("cropCode").notEmpty().withMessage("Crop is required"),
  body("quantityQtl").isFloat({ min: 0.1 }).withMessage("Quantity must be greater than 0"),
  body("askingPrice").isFloat({ min: 1 }).withMessage("Asking price is required")
], validate, c.create);
router.patch("/:id", protect, allow("farmer"), c.update);

module.exports = router;
