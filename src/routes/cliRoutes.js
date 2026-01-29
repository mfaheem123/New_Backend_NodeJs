const express = require("express");
const router = express.Router();
const cliController = require("../controllers/cliController");

router.post("/find-customer", cliController.findCustomer);

module.exports = router;
