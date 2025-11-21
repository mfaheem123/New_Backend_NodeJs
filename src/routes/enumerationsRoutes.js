const express = require("express");
const router = express.Router();
const { getAllEnumerations } = require("../controllers/enumerationsController");

router.get("/get", getAllEnumerations);

module.exports = router;
