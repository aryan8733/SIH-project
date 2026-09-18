const router = require("express").Router();
const { body } = require("express-validator");
const validate = require("../middleware/validate");
const { protect } = require("../middleware/auth");
const c = require("../controllers/auth.controller");

router.post("/register", [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("phone").matches(/^[6-9]\d{9}$/).withMessage("Enter a valid 10-digit mobile number"),
  body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
  body("role").isIn(["farmer", "buyer"]).withMessage("Role must be farmer or buyer")
], validate, c.register);

router.post("/login", [
  body("phone").notEmpty().withMessage("Mobile number is required"),
  body("password").notEmpty().withMessage("Password is required")
], validate, c.login);

router.get("/me", protect, c.me);
router.patch("/me", protect, c.updateMe);

module.exports = router;
