const express = require("express");
const router = express.Router();
const { calculateFare, calculateFareAllVehicles } = require("../controllers/fareController");

router.post("/calculate-fare", calculateFare);
router.post(
  "/calculate-fare-all-vehicles",calculateFareAllVehicles
);

module.exports = router;
