const express = require("express");
const router = express.Router();
const localizationController = require("../controllers/localizationController");

router.get("/getlocalization", localizationController.getAll);
router.get("/:id", localizationController.getById);
router.post("/", localizationController.create);
router.post("/:id", localizationController.update);
router.delete("/delete/:id", localizationController.delete);

module.exports = router;
