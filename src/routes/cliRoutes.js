const express = require("express");
const router = express.Router();
const cliController = require("../controllers/cliController");

router.get("/find-customer", cliController.findCustomer);

module.exports = router;
