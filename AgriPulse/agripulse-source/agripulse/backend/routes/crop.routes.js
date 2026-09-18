const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect, allow } = require("../middleware/auth");
const c = require("../controllers/crop.controller");

router.use(protect, allow("farmer"));
router.get("/", c.list);
router.post("/", [
  body("cropCode").notEmpty().withMessage("Crop is required"),
  body("quantityQtl").isFloat({ min: 0.1 }).withMessage("Quantity must be greater than 0")
], validate, c.create);
router.patch("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
