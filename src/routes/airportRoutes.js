const express = require("express");
const AirportController = require("../controllers/airportController");

const router = express.Router();

// GET all airports
router.get("/get", AirportController.getAirports);

// UPDATE airport
router.post("/edit/:id", AirportController.updateAirport);

// DELETE airport
router.delete("/delete/:id", AirportController.deleteAirport);

// Clear Airport Charges
router.post("/clear/:id", AirportController.clearCharges);


module.exports = router;
