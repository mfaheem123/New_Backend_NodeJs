const express = require("express");
const router = express.Router();
const { getEmailLogs } = require("../controllers/emailController");

// GET /api/emails?offset=0&limit=25&company_id=3
router.get("/emails", getEmailLogs);

module.exports = router;