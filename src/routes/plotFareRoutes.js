const express = require("express");
const router = express.Router();
const plotFareController = require("../controllers/plotFareController");

router.get("/get", plotFareController.getAll);
router.get("/getbyid/:id", plotFareController.getByID);
router.post("/add", plotFareController.create);
router.post("/update/:id", plotFareController.update);
router.delete("/delete/:id", plotFareController.delete);

module.exports = router;
