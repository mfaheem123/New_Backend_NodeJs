const pool = require("../db");

// 1️⃣ createSMSLog me company_id add kiya
async function createSMSLog(data) {
  const { company_id, template_id, mobile, message, status, gateway_response } =
    data;

  await pool.query(
    `INSERT INTO sms_logs 
    (company_id, template_id, mobile, message, status, gateway_response) 
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      company_id || null,
      template_id,
      mobile,
      message,
      status,
      gateway_response,
    ],
  );
}

// 2️⃣ getSMSLogs me optional company_id filter lagaya
async function getSMSLogs(limit = 25, offset = 0, company_id = null, filters = {}) {
  let countQuery = `SELECT COUNT(*) FROM sms_logs WHERE 1=1`;
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
    WHERE 1=1
  `;

  const queryParams = [];
  let paramIndex = 1;

  // 1. Company ID Filter
  if (company_id) {
    countQuery += ` AND company_id = $${paramIndex}`;
    dataQuery += ` AND company_id = $${paramIndex}`;
    queryParams.push(company_id);
    paramIndex++;
  }

  // 2. Number Search (Mobile)
  if (filters.number) {
    countQuery += ` AND mobile ILIKE $${paramIndex}`;
    dataQuery += ` AND mobile ILIKE $${paramIndex}`;
    queryParams.push(`%${filters.number}%`);
    paramIndex++;
  }

  // 3. SMS Message Search
  if (filters.sms) {
    countQuery += ` AND message ILIKE $${paramIndex}`;
    dataQuery += ` AND message ILIKE $${paramIndex}`;
    queryParams.push(`%${filters.sms}%`);
    paramIndex++;
  }

  // 4. Date Search (Since date format column par applied hai, hum text casting ya range use kar sakte hain ya fir TO_CHAR match)
  if (filters.date) {
    countQuery += ` AND TO_CHAR(created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') ILIKE $${paramIndex}`;
    dataQuery += ` AND TO_CHAR(created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') ILIKE $${paramIndex}`;
    queryParams.push(`%${filters.date}%`);
    paramIndex++;
  }

  // 5. Time Search
  if (filters.time) {
    countQuery += ` AND TO_CHAR(created_at AT TIME ZONE 'Europe/London', 'HH24:MI:SS') ILIKE $${paramIndex}`;
    dataQuery += ` AND TO_CHAR(created_at AT TIME ZONE 'Europe/London', 'HH24:MI:SS') ILIKE $${paramIndex}`;
    queryParams.push(`%${filters.time}%`);
    paramIndex++;
  }

  // 6. Status Search
  if (filters.status) {
    countQuery += ` AND status ILIKE $${paramIndex}`;
    dataQuery += ` AND status ILIKE $${paramIndex}`;
    queryParams.push(`%${filters.status}%`);
    paramIndex++;
  }

  // Total Count Fetch karna
  const countResult = await pool.query(countQuery, queryParams);
  const totalCount = parseInt(countResult.rows[0].count, 10);

  // Pagination Limit & Offset Parameters Add Karna
  dataQuery += ` ORDER BY id DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
  queryParams.push(limit, offset);

  const { rows } = await pool.query(dataQuery, queryParams);

  return {
    count: totalCount,
    messages: rows,
  };
}

module.exports = {
  createSMSLog,
  getSMSLogs,
};
