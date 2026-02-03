const express = require("express");
const router = express.Router();
const controller = require("../controllers/accountInvoiceBookingController");

router.get("/account_invoice/bookings", controller.getBookingsForInvoice);

module.exports = router;
