// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

router.post("/add", bookingController.createBooking);
router.get("/get/:id", bookingController.getBookingSections);
router.get("/getbytabs/:id", bookingController.getBookingByTabs);
router.get("/getbyid/:id", bookingController.getBookingById);
router.post("/getbydriverid/:id", bookingController.getBookingByDriverId);
router.post("/update/:id", bookingController.updateBooking);
router.post("/status/:id", bookingController.updateBookingStatus);
router.post("/fares/:id", bookingController.updateBookingFares);
router.delete("/delete/:id", bookingController.deleteBooking);
router.delete("/bulkdelete", bookingController.deleteMultipleBookings);

module.exports = router;
