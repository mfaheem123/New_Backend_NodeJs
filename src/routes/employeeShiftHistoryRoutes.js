const express = require("express");
const router = express.Router();
const controller = require("../controllers/employeeShiftHistoryController");

router.get("/activity", controller.getEmployeeShiftHistory);

module.exports = router;
