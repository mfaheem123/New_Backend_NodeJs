const express = require("express");
const router = express.Router();
const controller = require("../controllers/accountInvoiceController");

router.post("/account_invoices", controller.create);

module.exports = router;
