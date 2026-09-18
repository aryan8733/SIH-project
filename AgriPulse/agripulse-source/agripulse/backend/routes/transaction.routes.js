const router = require("express").Router();
const { protect } = require("../middleware/auth");
const c = require("../controllers/transaction.controller");

router.get("/", protect, c.list);

module.exports = router;
