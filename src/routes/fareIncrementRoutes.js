const express = require("express");
const router = express.Router();
const controller = require("../controllers/fareIncrementController");

router.get("/get", controller.getAll);
router.post("/add", controller.add);
router.post("/update/:id", controller.update);
router.delete("/delete/:id", controller.delete);

module.exports = router;
