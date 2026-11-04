const pool = require("../db");

const createAuthorization = async (roleId) => {
  const result = await pool.query(
    `INSERT INTO authorizations (role_id)
         VALUES ($1)
         RETURNING *`,
    [roleId],
  );
  return result.rows[0];
};

const getByRoleId = async (roleId) => {
  const result = await pool.query(
    `SELECT 
            a.*, 
            r.id as role_id,
            r.name as role_name
        FROM authorizations a
        JOIN roles r ON r.id = a.role_id
        WHERE a.role_id = $1`,
    [roleId],
  );

  return result.rows[0];
};

const updateAuthorization = async (roleId, data) => {
  // remove undefined or null fields
  const filteredEntries = Object.entries(data).filter(
    ([_, value]) => value !== undefined && value !== null,
  );

  if (filteredEntries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const keys = filteredEntries.map(([key]) => key);
  const values = filteredEntries.map(([_, value]) => value);

  const setQuery = keys
    .map((key, index) => `${key} = $${index + 2}`)
    .join(", ");

  const result = await pool.query(
    `UPDATE authorizations
     SET ${setQuery}
     WHERE role_id = $1
     RETURNING *`,
    [roleId, ...values],
  );

  return result.rows[0];
};

const deleteAuthorization = async (roleId) => {
  await pool.query(`DELETE FROM authorizations WHERE role_id = $1`, [roleId]);
};

module.exports = {
  createAuthorization,
  getByRoleId,
  updateAuthorization,
  deleteAuthorization,
};
