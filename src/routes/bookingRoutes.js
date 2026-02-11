// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

router.post("/add", bookingController.createBooking);
router.get("/get/:id", bookingController.getBookingSections);
router.get("/getbytabs/:id", bookingController.getBookingByTabs);
router.get("/getbyid/:id", bookingController.getBookingById);
router.get("/getbydriverid/:id", bookingController.getBookingByDriverId);
router.get(
  "/driver-commission",
  bookingController.getBookingByDriverCommission,
);
router.post("/update/:id", bookingController.updateBooking);
router.post("/status/:id", bookingController.updateBookingStatus);
router.post("/fares/:id", bookingController.updateBookingFares);
router.post("/cli", bookingController.cloneOneWayBooking);
router.delete("/delete/:id", bookingController.deleteBooking);
router.delete("/bulkdelete", bookingController.deleteMultipleBookings);

module.exports = router;
