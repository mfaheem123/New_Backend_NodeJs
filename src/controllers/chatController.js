const MessageModel = require("../models/messageModel");
const logger = require("../utils/logger");

class ChatController {
  // ---------------------------------------------------------
// GET CHAT HISTORY BETWEEN DRIVER AND SPECIFIC WEB ROLE (Controller/Admin/Super Admin)
// ---------------------------------------------------------
  static async getHistory(req, res) {
    try {
      const { company_id, user_id, role, target_id, target_role, chat_type } =
        req.query;

      if (!company_id || !user_id || !role || !target_role || !chat_type) {
        return res
          .status(400)
          .json({ success: false, message: "Missing required parameters" });
      }

      // Driver ID hamesha driver waali side ki ID hogi
      const driver_id = role.toUpperCase() === "DRIVER" ? user_id : target_id;

      // Web Role determine karein (Controller, Admin, ya Super Admin)
      const web_role = role.toUpperCase() === "DRIVER" ? target_role : role;

      const messages = await MessageModel.getChatHistory({
        company_id,
        driver_id,
        web_role,
        chat_type,
      });

      // Mark as read
      if (target_id) {
        await MessageModel.markAsRead({
          company_id,
          user_id,
          role,
          sender_id: target_id,
          sender_role: target_role,
        });
      }

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

  // ---------------------------------------------------------
// SEARCH MESSAGES BY KEYWORD
// ---------------------------------------------------------
  static async search(req, res) {
    try {
      const { company_id, user_id, role, target_id, target_role, keyword } =
        req.query;

      if (!company_id || !keyword || !user_id || !role) {
        return res.status(400).json({
          success: false,
          message: "Company ID, User ID, Role and Keyword are required",
        });
      }

      // Hamesha Driver ID extract karein (Chahe call Driver side se aaye ya Web Panel se)
      const driver_id = role.toUpperCase() === "DRIVER" ? user_id : target_id;
      
      // Target Web Role (SUPER ADMIN, ADMIN, CONTROLLER) determine karein
      const web_role = role.toUpperCase() === "DRIVER" ? target_role : role;

      const results = await MessageModel.searchMessages({
        company_id,
        driver_id,
        web_role,
        keyword,
      });

      return res
        .status(200)
        .json({ success: true, count: results.length, data: results });
    } catch (error) {
      logger.error("Error in search controller:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

module.exports = ChatController;
