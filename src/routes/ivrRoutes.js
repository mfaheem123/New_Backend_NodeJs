const express = require("express");
const router = express.Router();
const ivrController = require("../controllers/ivrController");

// MAIN IVR (Driver + Customer Flow)
router.post("/main", ivrController.mainIvr);

// FALLBACK IVR (Booking Creation)
router.post("/fallback", ivrController.fallbackIvr);

module.exports = router;
