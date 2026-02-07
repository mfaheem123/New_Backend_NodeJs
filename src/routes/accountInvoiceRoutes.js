const express = require("express");
const router = express.Router();
const accountInvoiceController = require("../controllers/accountInvoiceController");

router.post("/add", accountInvoiceController.create);

module.exports = router;
