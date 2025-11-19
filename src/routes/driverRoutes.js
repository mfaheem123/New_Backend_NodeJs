const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const driverController = require("../controllers/driverController");

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

// 🧩 Routes
router.post("/add", upload.any(), driverController.create);
router.get("/get", driverController.getAll);
router.get("/getbyid/:id", driverController.getById);
router.post("/edit/:id", upload.any(), driverController.update);
router.delete("/delete/:id", driverController.delete);
router.post("/login",upload.none(), driverController.driverLogin);
router.post("/verifytoken",upload.none(), driverController.verifyDriverToken);

router.post("/test-upload", upload.any(), (req, res) => {
  console.log("Test uploaded files:", req.files);
  res.json({ files: req.files });
});


module.exports = router;
