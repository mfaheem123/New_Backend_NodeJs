const db = require("../db");

class CallRecordingModel {
  static async create(data) {
    const query = `
      INSERT INTO call_recordings (
        company_id, authentication_token, event_type, recording_id, call_id,
        duration, recording_datetime, source, destination, is_protected,
        filename, file_path, remote_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `;

    const values = [
      data.company_id,
      data.token || null,
      data.event_type || null,
      data.recording_id || null,
      data.call_id || null,
      data.duration ? parseInt(data.duration, 10) : null,
      data.datetime ? new Date(data.datetime) : null,
      data.source || null,
      data.destination || null,
      data.is_protected === "true" || data.is_protected === true,
      data.filename || null,
      data.file_path || null,
      data.url || null,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  // 🔍 Get Recordings with Filters, Search, Customer JOIN & Pagination
  static async getRecordings(filters = {}) {
    const {
      offset = 0,
      limit = 15,
      mobile,
      from_date,
      to_date,
      company_id,
    } = filters;

    let conditions = [];
    let values = [];
    let paramIndex = 1;

    // Base Query with Customer JOIN
    // Note: 'customers' table ka naam aur column ('phone_number', 'name') apne schema ke mutabiq adjust kar lein.
    let baseQuery = `
      FROM call_recordings cr
      LEFT JOIN customers cust 
        ON (cust.phone_number = cr.source OR cust.phone_number = cr.destination)
      WHERE 1=1
    `;

    // 1. Company Filter (Optional)
    if (company_id) {
      conditions.push(`cr.company_id = $${paramIndex++}`);
      values.push(company_id);
    }

    // 2. Mobile / Search Filter (Source, Destination, ya Customer Name par)
    if (mobile) {
      conditions.push(`(
        cr.source LIKE $${paramIndex} OR 
        cr.destination LIKE $${paramIndex} OR 
        LOWER(cust.name) LIKE LOWER($${paramIndex})
      )`);
      values.push(`%${mobile}%`);
      paramIndex++;
    }

    // 3. Date Range Filters
    if (from_date) {
      conditions.push(`cr.recording_datetime >= $${paramIndex++}`);
      values.push(new Date(from_date));
    }

    if (to_date) {
      conditions.push(`cr.recording_datetime <= $${paramIndex++}`);
      values.push(new Date(to_date));
    }

    if (conditions.length > 0) {
      baseQuery += ` AND ` + conditions.join(" AND ");
    }

    // Total Count Query (For Pagination response)
    const countQuery = `SELECT COUNT(DISTINCT cr.id) ${baseQuery}`;
    const countResult = await db.query(countQuery, values);
    const totalCount = parseInt(countResult.rows[0].count, 10);

    // Data Fetch Query
    const dataQuery = `
      SELECT 
        cr.id AS _id,
        cr.recording_id,
        cr.authentication_token AS token,
        cr.event_type,
        cr.duration,
        cr.recording_datetime AS datetime,
        cr.source,
        cr.destination,
        cr.filename,
        cr.file_path,
        cust.name AS customer
      ${baseQuery}
      ORDER BY cr.recording_datetime DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    values.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(dataQuery, values);

    return {
      count: totalCount,
      recordings: result.rows,
    };
  }
}

module.exports = CallRecordingModel;
