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
} = require("../controllers/escortController");

// Ensure uploads folder exists
if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + file.originalname),
});

const upload = multer({ storage });

// ✅ Allow uploading any escort-related files (image/docs)
router.post("/add", upload.any(), create);
router.get("/get", getAll);
router.get("/getbyid/:id", getById);
router.post("/edit/:id", upload.any(), update);
router.delete("/delete/:id", remove);

module.exports = router;
