const express = require("express");
const router = express.Router();

const fareConfigurationMileageController = require("../controllers/fareConfigurationMileageController");

router.post(
  "/add",
  fareConfigurationMileageController.createFareConfigurationMileage,
);
router.get(
  "/get",
  fareConfigurationMileageController.getAllFareConfigurationsMileage,
);
router.get(
  "/getid/:id",
  fareConfigurationMileageController.getFareConfigurationMileageById,
);
router.post(
  "/update/:id",
  fareConfigurationMileageController.updateFareConfigurationMileage,
);
router.delete(
  "/delete/:id",
  fareConfigurationMileageController.deleteFareConfigurationMileage,
);

module.exports = router;
