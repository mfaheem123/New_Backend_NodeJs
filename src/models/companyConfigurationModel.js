const pool = require("../db");


exports.create = async (data) => {
  const columns = Object.keys(data);
  const values = Object.values(data);

  const placeholders = values.map((_, index) => `$${index + 1}`);

  const query = `
    INSERT INTO company_configurations
    (${columns.join(", ")})
    VALUES (${placeholders.join(", ")})
    RETURNING *
  `;

  const { rows } = await pool.query(query, values);

  return rows[0];
};

exports.getAll = async () => {
  const query = `
    SELECT cc.*,
           s.name AS subsidiary_name
    FROM company_configurations cc
    LEFT JOIN subsidiaries s
           ON s.id = cc.subsidiary_id
    ORDER BY cc.id DESC
  `;

  const { rows } = await pool.query(query);

  return rows;
};

exports.getById = async (id) => {
  const query = `
    SELECT cc.*,
           s.name AS subsidiary_name
    FROM company_configurations cc
    LEFT JOIN subsidiaries s
           ON s.id = cc.subsidiary_id
    WHERE cc.id = $1
  `;

  const { rows } = await pool.query(query, [id]);

  return rows[0];
};

exports.update = async (id, data) => {
  const fields = Object.keys(data);

  if (!fields.length) {
    throw new Error("No fields provided for update");
  }

  const values = Object.values(data);

  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(", ");

  const query = `
    UPDATE company_configurations
    SET
      ${setClause},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $${fields.length + 1}
    RETURNING *
  `;

  const { rows } = await pool.query(query, [...values, id]);

  return rows[0];
};

exports.delete = async (id) => {
  await pool.query(
    `DELETE FROM company_configurations
     WHERE id = $1`,
    [id]
  );
};