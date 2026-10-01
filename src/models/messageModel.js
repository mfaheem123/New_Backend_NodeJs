const pool = require("../db");

class MessageModel {
  // Save message to DB
  static async createMessage({ company_id, sender_id, sender_role, receiver_id, receiver_role, chat_type, message_type, content }) {
    const query = `
      INSERT INTO messages 
      (company_id, sender_id, sender_role, receiver_id, receiver_role, chat_type, message_type, content)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const values = [
      company_id,
      sender_id,
      sender_role,
      receiver_id,
      receiver_role,
      chat_type,
      message_type || 'text',
      content
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  // Fetch Chat History (Test Cases 5, 6, 13, 14, 15)
  static async getChatHistory({ company_id, user_id, role, target_id, target_role, chat_type }) {
    const query = `
      SELECT * FROM messages
      WHERE company_id = $1
        AND chat_type = $2
        AND (
          (sender_id = $3 AND sender_role = $4 AND receiver_id = $5 AND receiver_role = $6)
          OR
          (sender_id = $5 AND sender_role = $6 AND receiver_id = $3 AND receiver_role = $4)
        )
      ORDER BY created_at ASC;
    `;
    const values = [company_id, chat_type, user_id, role, target_id, target_role];
    const { rows } = await pool.query(query, values);
    return rows;
  }

  // Search Messages in Chat (Test Cases 11 & 12)
  static async searchMessages({ company_id, user_id, role, target_id, target_role, keyword }) {
    const query = `
      SELECT * FROM messages
      WHERE company_id = $1
        AND content ILIKE $2
        AND (
          (sender_id = $3 AND sender_role = $4 AND receiver_id = $5 AND receiver_role = $6)
          OR
          (sender_id = $5 AND sender_role = $6 AND receiver_id = $3 AND receiver_role = $4)
        )
      ORDER BY created_at DESC;
    `;
    const values = [company_id, `%${keyword}%`, user_id, role, target_id, target_role];
    const { rows } = await pool.query(query, values);
    return rows;
  }

  // Mark messages as read
  static async markAsRead({ company_id, user_id, role, sender_id, sender_role }) {
    const query = `
      UPDATE messages 
      SET is_read = TRUE 
      WHERE company_id = $1 AND receiver_id = $2 AND receiver_role = $3 
        AND sender_id = $4 AND sender_role = $5 AND is_read = FALSE;
    `;
    await pool.query(query, [company_id, user_id, role, sender_id, sender_role]);
  }
}

module.exports = MessageModel;