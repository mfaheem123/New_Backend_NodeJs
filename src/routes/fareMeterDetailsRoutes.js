const express = require("express");
const router = express.Router();
const controller = require("../controllers/fareMeterDetailsController");

router.get("/details", controller.getByVehicleType);

module.exports = router;