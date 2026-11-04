const express = require("express");
const router = express.Router();
const accountInvoiceBookingController = require("../controllers/accountInvoiceBookingController");

router.get("/bookings", accountInvoiceBookingController.getBookingsForInvoice);

module.exports = router;
