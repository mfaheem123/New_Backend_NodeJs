const express = require("express");
const router = express.Router();
const controller = require("../controllers/accountInvoiceBookingController");

router.get("/bookings", controller.getBookingsForInvoice);

module.exports = router;
