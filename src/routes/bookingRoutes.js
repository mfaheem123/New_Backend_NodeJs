// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/bookingController");

router.post("/add", ctrl.createBooking);
router.get("/get/:id", ctrl.getBookingSections);
router.get("/getbytabs/:id", ctrl.getBookingByTabs);
router.get("/getbyid/:id", ctrl.getBookingById);
router.post("/update/:id", ctrl.updateBooking);
router.delete("/delete/:id", ctrl.deleteBooking);

module.exports = router;
