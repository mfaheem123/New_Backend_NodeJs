const express = require("express");
const router = express.Router();

const customerInvoiceController = require("../controllers/customerInvoiceController");

router.post("/add", customerInvoiceController.create);

router.get("/get", customerInvoiceController.getAll);
router.get("/invoice-number", customerInvoiceController.customerInvoiceNumber);

router.get("/getbyid/:id", customerInvoiceController.getById);

router.put("/update/:id", customerInvoiceController.update);

router.put("/pay/:id", customerInvoiceController.pay);

router.delete("/delete/:id", customerInvoiceController.remove);

module.exports = router;
