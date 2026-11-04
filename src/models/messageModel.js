const pool = require("../db");

class MessageModel {
  // ---------------------------------------------------------
  // SAVE MESSAGE TO DB
  // ---------------------------------------------------------
  static async createMessage({
    company_id,
    sender_id,
    sender_role,
    receiver_id,
    receiver_role,
    chat_type,
    message_type,
    content,
    status = "SENT",
  }) {
    const query = `
      INSERT INTO messages 
      (company_id, sender_id, sender_role, receiver_id, receiver_role, chat_type, message_type, content, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const values = [
      company_id,
      sender_id,
      sender_role,
      receiver_id || null,
      receiver_role,
      chat_type,
      message_type || "text",
      content,
      status === "READ",
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }

  // ---------------------------------------------------------
  // GET CHAT HISTORY BETWEEN DRIVER AND SPECIFIC WEB ROLE (Controller/Admin/Super Admin)
  // ---------------------------------------------------------
  static async getChatHistory({ company_id, driver_id, web_role, chat_type }) {
    const query = `
      SELECT m.*, 
             CASE 
               WHEN m.sender_role = 'DRIVER' THEN d.name 
               ELSE e.username 
             END as sender_name
      FROM messages m
      LEFT JOIN drivers d ON m.sender_role = 'DRIVER' AND m.sender_id = d.id
      LEFT JOIN employees e ON m.sender_role != 'DRIVER' AND m.sender_id = e.id
      WHERE m.company_id = $1 
        AND m.chat_type = $2
        AND (
          -- Scenario 1: Driver ne is specific web_role (Controller/Admin/Super Admin) ko message bheja
          (m.sender_role = 'DRIVER' AND m.sender_id = $3 AND UPPER(m.receiver_role) = UPPER($4))
          OR 
          -- Scenario 2: Is specific web_role (Controller/Admin/Super Admin) ne is driver ko message bheja
          (UPPER(m.sender_role) = UPPER($4) AND m.receiver_role = 'DRIVER' AND m.receiver_id = $3)
        )
      ORDER BY m.created_at ASC;
    `;

    const { rows } = await pool.query(query, [
      company_id,
      chat_type,
      driver_id,
      web_role,
    ]);
    return rows;
  }

  // ---------------------------------------------------------
  // SEARCH MESSAGES BY KEYWORD (Role & ID Isolated)
  // ---------------------------------------------------------
  static async searchMessages({ company_id, driver_id, web_role, keyword }) {
    const query = `
      SELECT m.*, 
             CASE 
               WHEN m.sender_role = 'DRIVER' THEN d.name 
               ELSE e.username 
             END as sender_name
      FROM messages m
      LEFT JOIN drivers d ON m.sender_role = 'DRIVER' AND m.sender_id = d.id
      LEFT JOIN employees e ON m.sender_role != 'DRIVER' AND m.sender_id = e.id
      WHERE m.company_id = $1
        AND m.content ILIKE $2
        AND (
          -- Scenario 1: Driver ne is specific web_role ko message bheja (jahan receiver_id null bhi ho sakta hai)
          (m.sender_role = 'DRIVER' AND m.sender_id = $3 AND UPPER(m.receiver_role) = UPPER($4))
          OR 
          -- Scenario 2: Is specific web_role ne is driver ko message bheja
          (UPPER(m.sender_role) = UPPER($4) AND m.receiver_role = 'DRIVER' AND m.receiver_id = $3)
        )
      ORDER BY m.created_at DESC;
    `;

    const values = [company_id, `%${keyword}%`, driver_id, web_role];

    const { rows } = await pool.query(query, values);
    return rows;
  }

  // ---------------------------------------------------------
  // MARK MESSAGE AS READ
  // ---------------------------------------------------------
  static async markAsRead({
    company_id,
    user_id,
    role,
    sender_id,
    sender_role,
  }) {
    const query = `
      UPDATE messages 
      SET is_read = TRUE 
      WHERE company_id = $1 AND receiver_id = $2 AND receiver_role = $3 
        AND sender_id = $4 AND sender_role = $5 AND is_read = FALSE;
    `;
    await pool.query(query, [
      company_id,
      user_id,
      role,
      sender_id,
      sender_role,
    ]);
  }
}

module.exports = MessageModel;
