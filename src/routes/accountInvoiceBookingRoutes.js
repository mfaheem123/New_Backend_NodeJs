const express = require("express");
const router = express.Router();
const accountInvoiceBookingController = require("../controllers/accountInvoiceBookingController");

router.get("/bookings", accountInvoiceBookingController.getBookingsForInvoice);
router.get("/pre-bookings", accountInvoiceBookingController.getPreBookingsForInvoice);

module.exports = router;
