const express = require("express");
const router = express.Router();
const CustomerController = require("../controllers/customerController");

router.post("/add", CustomerController.createCustomer);
router.get("/get", CustomerController.getAllCustomers);
router.get("/getbyid/:id", CustomerController.getCustomerById);
router.get("/search", CustomerController.searchCustomerByMobile);
router.post("/edit/:id", CustomerController.updateCustomer);
router.delete("/delete/:id", CustomerController.deleteCustomer);

module.exports = router;
