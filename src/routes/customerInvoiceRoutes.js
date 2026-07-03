const express = require("express");
const router = express.Router();

const customerInvoiceController = require("../controllers/customerInvoiceController");

router.post("/add", customerInvoiceController.createCustomerInvoice);

router.get("/get", customerInvoiceController.getAllCustomerInvoice);

router.get("/invoice-number", customerInvoiceController.customerInvoiceNumber);

router.get("/getbyid/:id", customerInvoiceController.getByIdCustomerInvoice);

router.post("/update/:id", customerInvoiceController.updateCustomerInvoice);

router.post("/pay/:id", customerInvoiceController.payCustomerInvoice);

router.delete("/delete/:id", customerInvoiceController.removeCustomerInvoice);

module.exports = router;
