const pool = require("../db");

const COLUMNS = [
  "logo",
  "background_color",
  "foreground_color",
  "name",
  "telephone_number",
  "emergency_contact_number",
  "email",
  "fax",
  "website",
  "address",
  "sort_code",
  "account_number",
  "account_title",
  "bank",
  "company_number",
  "vat_number",
  "iban",
  "balance",
  "currency",
  "web_access_token",
  "mobile_access_token",
  "maximum_drivers",
  "active_drivers",
  "address_latitude",
  "address_longitude",
  "company_id",
];

// Get All Subsidiary With Pagination + Searching
const getAll = async ({
  page = 1,
  limit = 100,
  name,
  email,
  telephone_number,
  fax,
  address,
  company_id,
} = {}) => {
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (name) {
    conditions.push(`s.name ILIKE $${idx++}`);
    params.push(`%${name}%`);
  }
  if (email) {
    conditions.push(`s.email ILIKE $${idx++}`);
    params.push(`%${email}%`);
  }
  if (telephone_number) {
    conditions.push(`s.telephone_number ILIKE $${idx++}`);
    params.push(`%${telephone_number}%`);
  }
  if (fax) {
    conditions.push(`s.fax ILIKE $${idx++}`);
    params.push(`%${fax}%`);
  }
  if (address) {
    conditions.push(`s.address ILIKE $${idx++}`);
    params.push(`%${address}%`);
  }

  if (company_id) {
    conditions.push(`s.company_id = $${idx++}`);
    params.push(company_id);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // --- Count query ---
  const countQuery = `SELECT COUNT(*) AS total FROM subsidiaries s ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = Number(countResult.rows[0].total) || 0;

  // --- Data query ---
  params.push(limit, offset);
  const dataQuery = `
  SELECT 
    s.id,
    s.logo,
    s.background_color,
    s.foreground_color,
    s.name,
    s.telephone_number,
    s.emergency_contact_number,
    s.email,
    s.fax,
    s.website,
    s.address,
    s.sort_code,
    s.account_number,
    s.account_title,
    s.bank,
    s.company_number,
    s.vat_number,
    s.iban,
    s.balance,
    s.currency,
    s.web_access_token,
    s.mobile_access_token,
    s.maximum_drivers,
    s.active_drivers,
    s.address_latitude,
    s.address_longitude,
    s.created_at,
    s.updated_at
  FROM subsidiaries s
  ${whereClause}
  ORDER BY s.id ASC
  LIMIT $${params.length - 1} OFFSET $${params.length};
`;

  const { rows } = await pool.query(dataQuery, params);
  return { subsidiaries: rows, total };
};

const getById = async (id) => {
  const q = `SELECT * FROM subsidiaries WHERE id = $1`;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
};

const create = async (data) => {
  const cols = COLUMNS.filter((c) => data[c] !== undefined);

  const values = cols.map((c) => data[c]);
  const params = values.map((_, i) => `$${i + 1}`).join(",");

  // ❌ remove company_id from returning
  const returningCols = COLUMNS.filter((c) => c !== "company_id");

  const q = `
    INSERT INTO subsidiaries (${cols.join(",")})
    VALUES (${params})
    RETURNING ${returningCols.join(",")}
  `;

  const { rows } = await pool.query(q, values);
  return rows[0];
};

const update = async (id, data) => {
  const cols = COLUMNS.filter((c) => data[c] !== undefined);
  if (cols.length === 0) return await getById(id); // nothing to update
  const set = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const values = cols.map((c) => data[c]);
  values.push(id);
  const q = `UPDATE subsidiaries SET ${set}, updated_at = now() WHERE id = $${values.length} RETURNING *`;
  const { rows } = await pool.query(q, values);
  return rows[0] || null;
};

const remove = async (id) => {
  const q = `DELETE FROM subsidiaries WHERE id = $1 RETURNING *`;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
};

const getAllWithBankDetails = async ({ limit = 100, offset = 0 } = {}) => {
  const q = `
    SELECT 
      s.*,
      jsonb_build_object(
        'id', b.id,
        'subsidiary_id', b.subsidiary_id,
        'bank', b.bank,
        'account_title', b.account_title,
        'account_number', b.account_number,
        'iban', b.iban,
        'sort_code', b.sort_code,
        'vat_number', b.vat_number,
        'created_at', b.created_at,
        'updated_at', b.updated_at
      ) AS subsidiary_bank_details
    FROM subsidiaries s
    LEFT JOIN subsidiary_bank_details b 
    ON s.id = b.subsidiary_id
    ORDER BY s.id
    LIMIT $1 OFFSET $2;
  `;
  const { rows } = await pool.query(q, [limit, offset]);
  return rows;
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getAllWithBankDetails,
};
