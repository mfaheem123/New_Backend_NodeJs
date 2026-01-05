const express = require("express");
const router = express.Router();
const {
  getVehicleCompanyAndSubsidiaryData,
} = require("../controllers/getVehicleAndCompanyDataController");

router.get("/get", getVehicleCompanyAndSubsidiaryData);

module.exports = router;
