const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const callRecordingController = require('../controllers/callRecordingController');
const verifyVipVoipToken = require("../middlewares/verifyVipVoipToken");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    const filename = `rec_${Date.now()}_${Math.round(Math.random() * 1E9)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({ storage });

// Endpoint URL: POST /api/call-recordings/webhook?company_id=101
router.post('/webhook', upload.single('file'), verifyVipVoipToken,callRecordingController.handleWebhook);

module.exports = router;