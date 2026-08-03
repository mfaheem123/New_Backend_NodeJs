const express = require("express");
const router = express.Router();
const sinbinController = require("../controllers/driverSinbinController");

// Driver Sinbin Routes
router.post("/driver_sinbin", sinbinController.toggleDriverSinbin);
router.get("/sinbin_drivers/get", sinbinController.getSinbinDrivers);

// Settings Routes
router.get("/driver_sinbin_settings/get", sinbinController.getSinbinSettings);
router.post("/driver_sinbin_settings", sinbinController.updateSinbinSettings);

module.exports = router;
