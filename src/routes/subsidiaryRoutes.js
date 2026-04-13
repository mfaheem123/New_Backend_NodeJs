const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const subsidiaryController = require("../controllers/subsidiaryController");

// 🗂️ Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

// ⚙️ Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "_" + file.originalname);
  },
});

const upload = multer({ storage });

// Routes
router.get("/get", subsidiaryController.getAll);
router.get("/getbyid/:id", subsidiaryController.getById);
router.post("/add", upload.single("logo"), subsidiaryController.create);
router.post("/edit/:id", upload.single("logo"), subsidiaryController.update);
router.delete("/delete/:id", subsidiaryController.remove);
router.get("/with-bank-details", subsidiaryController.getAllWithBankDetails);

module.exports = router;
