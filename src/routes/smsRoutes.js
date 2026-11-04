const express = require("express");
const router = express.Router();
const { sendSMS, getMessages } = require("../controllers/smsController");

// Existing POST Route
router.post("/send-sms", sendSMS);

// 📌 NAYA GET ROUTE (Exact endpoint: /api/messages?offset=0&limit=25)
router.get("/messages", getMessages);

module.exports = router;
