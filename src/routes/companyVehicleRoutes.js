const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  create,
  getAll,
  getById,
  update,
  remove,
} = require("../controllers/companyVehicleController");

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

// ✅ Use upload.any() instead of upload.fields()
router.post("/add", upload.any(), create);
router.get("/get", getAll);
router.get("/:id", getById);
router.post("/edit/:id", upload.any(), update);
router.delete("/delete/:id", remove);

module.exports = router;
