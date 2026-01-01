const express = require("express");
const router = express.Router();
const { calculateFare } = require("../controllers/fareController");

router.post("/calculate-fare", calculateFare);

module.exports = router;
