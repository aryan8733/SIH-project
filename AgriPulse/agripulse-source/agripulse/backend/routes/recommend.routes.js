const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const c = require("../controllers/recommend.controller");

const lotRules = [
  body("cropCode").notEmpty().withMessage("cropCode is required"),
  body("quantityQtl").isFloat({ min: 0.1 }).withMessage("quantityQtl must be greater than 0"),
  body("quality").optional().isIn(["A", "B", "C"])
];

router.post("/markets", protect, lotRules, validate, c.markets);
router.post("/buyers", protect, lotRules, validate, c.buyers);
router.post("/forecast", protect, c.forecast);
router.post("/decision", protect, lotRules, validate, c.decision);

module.exports = router;
