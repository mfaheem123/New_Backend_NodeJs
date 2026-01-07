const express = require("express");
const router = express.Router();
const controller = require("../controllers/driverAppFeaturesController");

router.post("/app_features", controller.updateDriverAppFeatures);
router.get("/app_features", controller.getDriverAppFeatures);

module.exports = router;
