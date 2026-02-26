const express = require("express");
const router = express.Router();
const CustomerController = require("../controllers/customerController");

router.post("/add", CustomerController.createCustomer);
router.get("/get", CustomerController.getAllCustomers);
router.get("/getbyid/:id", CustomerController.getCustomerById);
router.get("/search", CustomerController.searchCustomerByMobile);
router.post("/edit/:id", CustomerController.updateCustomer);
router.post("/verify-otp", CustomerController.verifyEmailOTP);
router.post("/resend-otp", CustomerController.resendEmailOTP);
router.post("/forgot-password", CustomerController.forgotPassword);
router.post("/reset-password", CustomerController.resetPassword);
router.post("/change-password/:id", CustomerController.changePassword);
router.post("/login", CustomerController.customerLogin);
router.delete("/delete/:id", CustomerController.deleteCustomer);

module.exports = router;
