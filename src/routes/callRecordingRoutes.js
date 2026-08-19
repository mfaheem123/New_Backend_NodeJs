const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const callRecordingController = require("../controllers/callRecordingController");
const verifyVipVoipToken = require("../middlewares/verifyVipVoipToken");

// 🗂️ Ensure uploads folder exists
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads");
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp4";
    const filename = `rec_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

// Endpoint URL: POST /api/call-recordings/webhook?company_id=101
router.post(
  "/webhook",
  upload.single("file"),
  verifyVipVoipToken,
  callRecordingController.handleWebhook,
);

router.get("/recordings", callRecordingController.getCallRecordings);

module.exports = router;
