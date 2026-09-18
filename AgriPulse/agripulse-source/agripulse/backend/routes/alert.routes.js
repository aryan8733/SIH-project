const router = require("express").Router();
const { protect, allow } = require("../middleware/auth");
const c = require("../controllers/alert.controller");

router.use(protect, allow("farmer"));
router.get("/", c.list);
router.get("/triggered", c.triggered);
router.post("/", c.create);
router.patch("/:id", c.update);
router.delete("/:id", c.remove);

module.exports = router;
