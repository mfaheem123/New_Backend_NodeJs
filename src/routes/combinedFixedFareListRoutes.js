// routes/combinedRoutes.js
const express = require("express");
const router = express.Router();
const combinedController = require("../controllers/combinedFixedFareListController");

// GET /api/combined/vehicle-type-accounts
router.get(
  "/vehicle-location-types",
  combinedController.getVehicleTypeAndLocationTypes,
);

module.exports = router;
