const pool = require("../db");

const COLUMNS = [
  "subsidiary_id",
  "role_id",
  "username",
  "password",
  "confirmpassword",
  "email",
  "phone",
  "fax",
  "image",
  "release_note_viewed",
  "active",
  "alldrivers",
  "allbookings",
  "allaccounts",
  "callreceiver",
  "allowtransferbookings"
];

// Get all employees with role + subsidiary info
const getAll = async ({
  page = 1,
  limit = 100,
  username,
  email,
  phone,
  fax,
  role,
  subsidiary,
} = {}) => {
  const offset = (page - 1) * limit;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (username) {
    conditions.push(`e.username ILIKE $${idx++}`);
    params.push(`%${username}%`);
  }
  if (email) {
    conditions.push(`e.email ILIKE $${idx++}`);
    params.push(`%${email}%`);
  }
  if (phone) {
    conditions.push(`e.phone ILIKE $${idx++}`);
    params.push(`%${phone}%`);
  }
  if (fax) {
    conditions.push(`e.fax ILIKE $${idx++}`);
    params.push(`%${fax}%`);
  }
  if (role) {
    conditions.push(`r.name ILIKE $${idx++}`);
    params.push(`%${role}%`);
  }
  if (subsidiary) {
    conditions.push(`s.name ILIKE $${idx++}`);
    params.push(`%${subsidiary}%`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // --- Count query ---
  const countQuery = `
    SELECT COUNT(*) AS total
    FROM employees e
    LEFT JOIN roles r ON e.role_id = r.id
    LEFT JOIN subsidiaries s ON e.subsidiary_id = s.id
    ${whereClause}
  `;
  const countResult = await pool.query(countQuery, params);
  const total = Number(countResult.rows[0].total) || 0;

  // --- Data query ---
  params.push(limit, offset);
  const dataQuery = `
    SELECT 
      e.*,
      r.name AS role_name,
      s.name AS subsidiary_name
    FROM employees e
    LEFT JOIN roles r ON e.role_id = r.id
    LEFT JOIN subsidiaries s ON e.subsidiary_id = s.id
    ${whereClause}
    ORDER BY e.id ASC
    LIMIT $${params.length - 1} OFFSET $${params.length};
  `;
  const { rows } = await pool.query(dataQuery, params);

  return {
    employees: rows.map((emp) => ({
      ...emp,
      role: emp.role_name ? { name: emp.role_name } : null,
      subsidiary: emp.subsidiary_name ? { name: emp.subsidiary_name } : null,
    })),
    total,
  };
};

// Get employee by ID with role + subsidiary
const getById = async (id) => {
  const q = `
    SELECT 
      e.*,
      r.name AS role_name,
      s.name AS subsidiary_name
    FROM employees e
    LEFT JOIN roles r ON e.role_id = r.id
    LEFT JOIN subsidiaries s ON e.subsidiary_id = s.id
    WHERE e.id = $1;
  `;
  const { rows } = await pool.query(q, [id]);
  const emp = rows[0];
  if (!emp) return null;
  return {
    ...emp,
    role: emp.role_name ? { name: emp.role_name } : null,
    subsidiary: emp.subsidiary_name ? { name: emp.subsidiary_name } : null,
  };
};

// Get employee by username (case-insensitive)
const getByUsername = async (username) => {
  const q = `SELECT * FROM employees WHERE LOWER(username) = LOWER($1)`;
  const { rows } = await pool.query(q, [username]);
  return rows[0] || null;
};

// Create new employee
const create = async (data) => {
  const cols = COLUMNS.filter((c) => data[c] !== undefined);
  const values = cols.map((c) =>
    c === "username" ? data[c].toLowerCase() : data[c],
  );
  const params = values.map((_, i) => `$${i + 1}`).join(",");
  const q = `INSERT INTO employees (${cols.join(
    ",",
  )}) VALUES (${params}) RETURNING *`;
  const { rows } = await pool.query(q, values);
  return rows[0];
};

// Update employee
const update = async (id, data) => {
  const cols = COLUMNS.filter((c) => data[c] !== undefined);
  if (cols.length === 0) return await getById(id);
  const set = cols.map((c, i) => `${c} = $${i + 1}`).join(", ");
  const values = cols.map((c) =>
    c === "username" ? data[c].toLowerCase() : data[c],
  );
  values.push(id);
  const q = `UPDATE employees SET ${set}, updated_at = now() WHERE id = $${values.length} RETURNING *`;
  const { rows } = await pool.query(q, values);
  return rows[0] || null;
};

// Delete employee
const remove = async (id) => {
  const q = `DELETE FROM employees WHERE id = $1 RETURNING *`;
  const { rows } = await pool.query(q, [id]);
  return rows[0] || null;
};

module.exports = {
  getAll,
  getById,
  getByUsername,
  create,
  update,
  remove,
};
