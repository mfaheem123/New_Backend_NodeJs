const express = require("express");
const router = express.Router();
const fareIncrementController = require("../controllers/fareIncrementController");

router.get("/get", fareIncrementController.getAll);
router.post("/add", fareIncrementController.add);
router.post("/update/:id", fareIncrementController.update);
router.delete("/delete/:id", fareIncrementController.delete);

module.exports = router;
