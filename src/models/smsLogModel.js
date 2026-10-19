const pool = require("../db");

// 1️⃣ createSMSLog me company_id add kiya
async function createSMSLog(data) {
  const { company_id, template_id, mobile, message, status, gateway_response } = data;

  await pool.query(
    `INSERT INTO sms_logs 
    (company_id, template_id, mobile, message, status, gateway_response) 
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [company_id || null, template_id, mobile, message, status, gateway_response]
  );
}

// 2️⃣ getSMSLogs me optional company_id filter lagaya
async function getSMSLogs(limit = 25, offset = 0, company_id = null) {
  let countQuery = `SELECT COUNT(*) FROM sms_logs`;
  let dataQuery = `
    SELECT 
      id,
      company_id,
      mobile AS number,
      message AS sms,
      TO_CHAR(created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') AS date,
      TO_CHAR(created_at AT TIME ZONE 'Europe/London', 'HH24:MI:SS') AS time,
      LOWER(status) AS status
    FROM sms_logs
  `;

  const queryParams = [];
  
  // Agar company_id aati hai tou filter apply karein
  if (company_id) {
    countQuery += ` WHERE company_id = $1`;
    dataQuery += ` WHERE company_id = $1`;
    queryParams.push(company_id);
  }

  const countResult = await pool.query(countQuery, queryParams);
  const totalCount = parseInt(countResult.rows[0].count, 10);

  // Pagination limit/offset Parameters
  dataQuery += ` ORDER BY id DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(limit, offset);

  const { rows } = await pool.query(dataQuery, queryParams);

  return {
    count: totalCount,
    messages: rows,
  };
}

module.exports = { 
  createSMSLog, 
  getSMSLogs 
};