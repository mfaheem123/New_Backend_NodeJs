// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

//GET APIS
router.get("/get/:id", bookingController.getBookingSections);
router.get("/getbytabs/:id", bookingController.getBookingByTabs);
router.get("/getbyid/:id", bookingController.getBookingById);
router.get("/getbydriverid/:id", bookingController.getBookingByDriverId);
router.get("/driver-current-booking", bookingController.getCurrentJob);
router.get("/driver-total-earning/:id", bookingController.getDriverEarning);
router.get("/check-status/:booking_id", bookingController.checkBookingStatus);
router.get("/driver-rent", bookingController.getBookingByDriverCommission);
router.get(
  "/check-active-booking",
  bookingController.checkDriverActiveBookingToday,
);
router.get(
  "/driver-commission",
  bookingController.getBookingByDriverCommission,
);

//POST APIS
router.post("/add", bookingController.createBooking);
router.post("/update/:id", bookingController.updateBooking);
router.post("/status/:id", bookingController.updateBookingStatus);
router.post("/fares/:id", bookingController.updateBookingFares);
router.post("/fare-charges/:id", bookingController.updateBookingFareCharges);
router.post("/cli", bookingController.cloneOneWayBooking);
router.post("/assign-driver", bookingController.assignDriverToBooking);
router.post(
  "/booking-history-driver",
  bookingController.getBookingByDriverIdAndStatus,
);

//DELETE APIS
router.delete("/delete/:id", bookingController.deleteBooking);
router.delete("/bulkdelete", bookingController.deleteMultipleBookings);

module.exports = router;
