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

  // Get Emails List with Pagination & Filtering
  async getByCompany({ companyId, limit = 25, offset = 0 }) {
    const dataQuery = `
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
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3;
    `;

    const countQuery = `
      SELECT COUNT(*) FROM email_logs WHERE company_id = $1;
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [companyId, limit, offset]),
      db.query(countQuery, [companyId]),
    ]);

    return {
      emails: dataResult.rows,
      totalCount: parseInt(countResult.rows[0].count, 10),
    };
  },
};

module.exports = EmailLogModel;
