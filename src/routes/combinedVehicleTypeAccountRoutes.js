// routes/combinedRoutes.js
const express = require("express");
const router = express.Router();
const combinedController = require("../controllers/combinedVehicleTypeAccountController");

// GET /api/combined/vehicle-type-accounts
router.get(
  "/vehicle-type-accounts",
  combinedController.getVehicleTypeAndAccounts,
);

module.exports = router;
