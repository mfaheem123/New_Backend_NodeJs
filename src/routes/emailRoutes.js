const express = require("express");
const router = express.Router();
const {
  getEmailLogs,
  sendCustomEmail,
} = require("../controllers/emailController");

// GET /api/emails?offset=0&limit=25&company_id=3
router.get("/tracking", getEmailLogs);

// 🔹 POST /api/emails/send (Frontend modal yahan request bhejega)
router.post("/send", sendCustomEmail);

module.exports = router;
