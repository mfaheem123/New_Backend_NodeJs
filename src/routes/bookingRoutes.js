// routes/bookingRoutes.js
const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");

//BOOKING GET APIS ROUTES
router.get("/get/:id", bookingController.getBookingSections);
router.get("/getbytabs/:id", bookingController.getBookingByTabs);
router.get("/getbyid/:id", bookingController.getBookingById);
router.get("/reference-number", bookingController.getBookingByReferenceNumber);
router.get("/getbydriverid/:id", bookingController.getBookingByDriverId);
router.get("/driver-current-booking", bookingController.getCurrentJob);
router.get("/driver-total-earning/:id", bookingController.getDriverEarning);
router.get("/check-status/:booking_id", bookingController.checkBookingStatus);
router.get("/driver-rent", bookingController.getBookingByDriverCommission);
router.get("/customer-bookings/:id", bookingController.getBookingByCustomerId);
router.get("/customer-jobs", bookingController.getBookingByCustomerMobile);
router.get("/driver-fob/:id", bookingController.getBookingByDriverIdAndFob);
router.get("/driver-logs", bookingController.getCompletedBookingLogsByDriverId);
router.get("/booking-statistics", bookingController.getBookingStatistics);
router.get("/income-report", bookingController.getIncomeReport);
router.get("/clear", bookingController.getClearBookings);
router.get("/driver-earnings", bookingController.getDriverEarningsBookings);

router.get(
  "/check-status-customer/:booking_id",
  bookingController.checkBookingStatusCustomer,
);

router.get(
  "/driver-today-earning/:id",
  bookingController.getDriverTodayEarning,
);

router.get(
  "/fob-history/:id",
  bookingController.getFOBBookingHIstoryByDriverId,
);

router.get(
  "/customer-schedule/:id",
  bookingController.getScheduleBookingByCustomerId,
);

router.get(
  "/check-active-booking",
  bookingController.checkDriverActiveBookingToday,
);

router.get(
  "/driver-commission",
  bookingController.getBookingByDriverCommission,
);

router.get(
  "/booking-driver-statistics",
  bookingController.getDriverEarningsStatistics,
);

router.get(
  "/booking-statistics-graph",
  bookingController.getBookingStatisticsGraph,
);

router.get(
  "/customer-invoice-bookings",
  bookingController.getBookingsForCustomerInvoice,
);

//BOOKING POST APIS ROUTES
router.post("/add", bookingController.createBooking);
router.post("/update/:id", bookingController.updateBooking);
router.post("/status/:id", bookingController.updateBookingStatus);
router.post("/fares/:id", bookingController.updateBookingFares);
router.post("/fare-charges/:id", bookingController.updateBookingFareCharges);
router.post("/recover-booking/:id", bookingController.recoverDashboardBooking);
router.post("/cli", bookingController.cloneOneWayBooking);
router.post("/assign-driver", bookingController.assignDriverToBooking);
router.post("/fob-driver", bookingController.assignFOBBookingToDriver);
router.post("/clear-selected", bookingController.clearSelectedBookings);
router.post("/clear-all", bookingController.clearAllBookings);

router.post(
  "/dashboard-fares/:id",
  bookingController.updateDashboardBookingFares,
);

router.post(
  "/recover-driver-booking/:id",
  bookingController.recoverDriverBooking,
);

router.post(
  "/reject-recover-driver/:id",
  bookingController.rejectRecoverBooking,
);

router.post(
  "/no-pickup-driver-booking/:id",
  bookingController.noPickupDriverBooking,
);

router.post(
  "/reject-no-pickup-driver/:id",
  bookingController.rejectNoPickupBooking,
);

router.post(
  "/completed-booking/:id",
  bookingController.completeBoookingByController,
);

router.post(
  "/booking-history-driver",
  bookingController.getBookingByDriverIdAndStatus,
);

router.post(
  "/no-pickup-booking/:id",
  bookingController.noPickupDashboardBooking,
);

//BOOKING DELETE APIS ROUTES
router.delete("/delete/:id", bookingController.deleteBooking);
router.delete("/bulkdelete", bookingController.deleteMultipleBookings);

module.exports = router;
