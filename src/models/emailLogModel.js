const db = require("../db"); // Aapka PostgreSQL DB connection pool

const EmailLogModel = {
  // Save Email Log
  async create({
    companyId,
    subsidiaryId,
    email,
    subject,
    content,
    status,
    errorMessage,
  }) {
    const query = `
      INSERT INTO email_logs (company_id, subsidiary_id, recipient_email, subject, content, status, error_message)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      companyId,
      subsidiaryId,
      email,
      subject,
      content,
      status,
      errorMessage || null,
    ];
    const { rows } = await db.query(query, values);
    return rows[0];
  },

  // Get Emails List with Searching & Pagination
  async getByCompany({ companyId, limit = 25, offset = 0, filters = {} }) {
    let dataQuery = `
      SELECT 
        id, 
        recipient_email AS email, 
        subject, 
        content, 
        TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
        TO_CHAR(created_at, 'HH24:MI:SS') AS time,
        status
      FROM email_logs
      WHERE company_id = $1
    `;

    let countQuery = `
      SELECT COUNT(*) FROM email_logs WHERE company_id = $1
    `;

    const queryParams = [companyId];
    let paramIndex = 2;

    // 1. Email Search
    if (filters.email) {
      dataQuery += ` AND recipient_email ILIKE $${paramIndex}`;
      countQuery += ` AND recipient_email ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.email}%`);
      paramIndex++;
    }

    // 2. Subject Search
    if (filters.subject) {
      dataQuery += ` AND subject ILIKE $${paramIndex}`;
      countQuery += ` AND subject ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.subject}%`);
      paramIndex++;
    }

    // 3. Content Search
    if (filters.content) {
      dataQuery += ` AND content ILIKE $${paramIndex}`;
      countQuery += ` AND content ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.content}%`);
      paramIndex++;
    }

    // 4. Status Search
    if (filters.status) {
      dataQuery += ` AND status ILIKE $${paramIndex}`;
      countQuery += ` AND status ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.status}%`);
      paramIndex++;
    }

    // 5. Date Search
    if (filters.date) {
      dataQuery += ` AND TO_CHAR(created_at, 'YYYY-MM-DD') ILIKE $${paramIndex}`;
      countQuery += ` AND TO_CHAR(created_at, 'YYYY-MM-DD') ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.date}%`);
      paramIndex++;
    }

    // 6. Time Search
    if (filters.time) {
      dataQuery += ` AND TO_CHAR(created_at, 'HH24:MI:SS') ILIKE $${paramIndex}`;
      countQuery += ` AND TO_CHAR(created_at, 'HH24:MI:SS') ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.time}%`);
      paramIndex++;
    }

    // Order and Pagination Limit/Offset
    dataQuery += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

    // Data query ke liye limit aur offset parameters alag array mein push karein
    const dataParams = [...queryParams, limit, offset];

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, dataParams),
      db.query(countQuery, queryParams), // Count query ko limit/offset ki zarurat nahi hoti
    ]);

    return {
      emails: dataResult.rows,
      totalCount: parseInt(countResult.rows[0].count, 10),
    };
  },
};

module.exports = EmailLogModel;
