const express = require("express");
const router = express.Router();
const ChatController = require("../controllers/chatController");

// Fetch history route
router.get("/history", ChatController.getHistory);

// Search messages route
router.get("/search", ChatController.search);

module.exports = router;
