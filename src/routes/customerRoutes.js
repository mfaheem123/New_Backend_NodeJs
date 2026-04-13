const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const CustomerController = require("../controllers/customerController");

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

router.post("/add", upload.none(), CustomerController.createCustomer);
router.get("/get", CustomerController.getAllCustomers);
router.get("/getbyid/:id", CustomerController.getCustomerById);
router.get("/search", CustomerController.searchCustomerByMobile);
router.get("/search-data", CustomerController.searchCustomerDataByMobile);
router.post("/edit/:id", upload.none(), CustomerController.updateCustomer);
router.post("/verify-otp", upload.none(), CustomerController.verifyEmailOTP);
router.post("/resend-otp", upload.none(), CustomerController.resendEmailOTP);
router.post(
  "/forgot-password",
  upload.none(),
  CustomerController.forgotPassword,
);
router.post("/reset-password", upload.none(), CustomerController.resetPassword);
router.post(
  "/change-password/:id",
  upload.none(),
  CustomerController.changePassword,
);
router.post(
  "/profile-image/:id",
  upload.single("image"),
  CustomerController.updateProfileImage,
);
router.post("/login", upload.none(), CustomerController.customerLogin);
router.delete("/delete/:id", CustomerController.deleteCustomer);

module.exports = router;
