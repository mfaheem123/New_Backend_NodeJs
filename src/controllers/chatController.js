const MessageModel = require("../models/messageModel");
const logger = require("../utils/logger");

class ChatController {
  // Get Chat History
  static async getHistory(req, res) {
  try {
    const { company_id, user_id, role, target_id, target_role, chat_type } = req.query;

    if (!company_id || !user_id || !role || !target_id || !target_role || !chat_type) {
      return res.status(400).json({ success: false, message: "Missing required parameters" });
    }

    // Identify dynamic driver_id & user/target IDs
    const driver_id = role === 'DRIVER' ? user_id : target_id;

    const messages = await MessageModel.getChatHistory({
      company_id,
      user_id,
      role,
      target_id,
      target_role,
      driver_id,
      chat_type,
    });

    // Mark as read
    await MessageModel.markAsRead({
      company_id,
      user_id,
      role,
      sender_id: target_id,
      sender_role: target_role,
    });

    return res.status(200).json({ success: true, data: messages });
  } catch (error) {
    logger.error("Error in getHistory controller:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

  // Search Messages
  static async search(req, res) {
    try {
      const { company_id, user_id, role, target_id, target_role, keyword } =
        req.query;

      if (!company_id || !keyword) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Company ID and Keyword are required",
          });
      }

      const results = await MessageModel.searchMessages({
        company_id,
        user_id,
        role,
        target_id,
        target_role,
        keyword,
      });

      return res
        .status(200)
        .json({ success: true, count: results.length, data: results });
    } catch (error) {
      logger.error("Error in search controller:", error);
      return res
        .status(500)
        .json({
          success: false,
          message: "Internal server error",
          error: error.message,
        });
    }
  }
}

module.exports = ChatController;
