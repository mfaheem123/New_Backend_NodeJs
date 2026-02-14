const express = require("express");
const router = express.Router();
const accountInvoiceController = require("../controllers/accountInvoiceController");

router.post("/add", accountInvoiceController.create);
router.get("/get", accountInvoiceController.getAll);
router.post("/update/:id", accountInvoiceController.update);
router.delete("/delete/:id", accountInvoiceController.delete);

module.exports = router;
