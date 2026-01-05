const express = require("express");
const router = express.Router();
const {
  getCombinedData,
} = require("../controllers/locationType-ZoneController");

router.get("/zone", getCombinedData);

module.exports = router;
