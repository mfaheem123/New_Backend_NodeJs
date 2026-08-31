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
    limit = 20,
    mobile,
    from_date,
    to_date,
    company_id,
  } = filters;

  const parsedLimit = parseInt(limit, 10);
  const parsedOffset = parseInt(offset, 10);

  let conditions = [];
  let values = [];
  let paramIndex = 1;

  // Base Query
  let baseQuery = `
    FROM call_recordings cr
    LEFT JOIN customers cust 
      ON (
        cr.source = cust.mobile 
        OR cr.destination = cust.mobile
        OR REPLACE(cr.source, '44', '0') = cust.mobile
        OR REPLACE(cr.destination, '44', '0') = cust.mobile
        OR cr.source = REGEXP_REPLACE(cust.mobile, '^0', '44')
        OR cr.destination = REGEXP_REPLACE(cust.mobile, '^0', '44')
      )
      ${company_id ? `AND cust.company_id = cr.company_id` : ""}
    WHERE 1=1
  `;

  // 1. Company Filter
  if (company_id) {
    conditions.push(`cr.company_id = $${paramIndex++}`);
    values.push(company_id);
  }

  // 2. Mobile / Search Filter
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
    values.push(`${from_date} 00:00:00`);
  }

  if (to_date) {
    conditions.push(`cr.recording_datetime <= $${paramIndex++}`);
    values.push(`${to_date} 23:59:59`);
  }

  if (conditions.length > 0) {
    baseQuery += ` AND ` + conditions.join(" AND ");
  }

  // Total Count Query
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

  values.push(parsedLimit, parsedOffset);

  const result = await db.query(dataQuery, values);

  // Pagination Math
  const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;
  const totalPages = Math.ceil(totalCount / parsedLimit);

  return {
    count: totalCount,
    currentPage,
    totalPages,
    limit: parsedLimit,
    offset: parsedOffset,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    recordings: result.rows,
  };
}
}

module.exports = CallRecordingModel;
