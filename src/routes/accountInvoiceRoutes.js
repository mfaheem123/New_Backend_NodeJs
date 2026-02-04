const express = require("express");
const router = express.Router();
const controller = require("../controllers/accountInvoiceController");

router.post("/add", controller.create);

module.exports = router;
