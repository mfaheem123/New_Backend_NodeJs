const express = require("express");
const router = express.Router();
const sinbinController = require("../controllers/driverSinbinController");

// Driver Sinbin Routes
router.post("/driver-sinbin/add", sinbinController.toggleDriverSinbin);
router.get("/sinbin-drivers/get", sinbinController.getSinbinDrivers);

// Settings Routes
router.get("/driver-sinbin-settings/get", sinbinController.getSinbinSettings);
router.post("/driver-sinbin-settings", sinbinController.updateSinbinSettings);

module.exports = router;
