const express = require("express");
const router = express.Router();

const customerInvoiceController = require("../controllers/customerInvoiceController");

router.post("/customer_invoice", customerInvoiceController.create);

router.get("/customer_invoices", customerInvoiceController.getAll);

router.get("/customer_invoice/:id", customerInvoiceController.getById);

router.put("/customer_invoice/:id", customerInvoiceController.update);

router.put("/customer_invoice/pay/:id", customerInvoiceController.pay);

router.delete("/customer_invoice/:id", customerInvoiceController.remove);

module.exports = router;
