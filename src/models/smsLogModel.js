const pool = require("../db");

async function createSMSLog(data) {
  const { template_id, mobile, message, status, gateway_response } = data;

  await pool.query(
    `INSERT INTO sms_logs 
    (template_id, mobile, message, status, gateway_response) 
    VALUES ($1, $2, $3, $4, $5)`,
    [template_id, mobile, message, status, gateway_response],
  );
}

// 📌 NAYA FUNCTION: API ke liye DB se SMS fetching
async function getSMSLogs(limit = 25, offset = 0) {
  const countResult = await pool.query(`SELECT COUNT(*) FROM sms_logs`);
  const totalCount = parseInt(countResult.rows[0].count, 10);

  // 📌 'Europe/London' time zone explicitly mention karne se exact UK date aur time milega
  const query = `
    SELECT 
      id,
      mobile AS number,
      message AS sms,
      TO_CHAR(created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS date,
      TO_CHAR(created_at AT TIME ZONE 'Europe/London', 'HH24:MI:SS') AS time,
      LOWER(status) AS status
    FROM sms_logs
    ORDER BY id DESC
    LIMIT $1 OFFSET $2;
  `;

  const { rows } = await pool.query(query, [limit, offset]);

  return {
    count: totalCount,
    messages: rows,
  };
}

module.exports = { createSMSLog, getSMSLogs };
