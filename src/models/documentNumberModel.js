const pool = require("../db");

/* CREATE */
exports.create = async (data) => {
  const {
    subsidiary_id,
    document_table,
    document_column,
    prefix,
    start_number,
    end_number,
    increment_value,
    auto_increment,
  } = data;

  const res = await pool.query(
    `
    INSERT INTO document_numbers (
      subsidiary_id, document_table, document_column,
      prefix, start_number, end_number,
      increment_value, auto_increment
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    RETURNING *
  `,
    [
      subsidiary_id,
      document_table,
      document_column,
      prefix,
      start_number,
      end_number,
      increment_value,
      auto_increment,
    ],
  );

  return res.rows[0];
};

/* GET ALL (WITH PAGINATION + JOIN) */
exports.getAll = async ({ offset = 0, limit = 10 }) => {
  const data = await pool.query(
    `
    SELECT
      dn.*,
      json_build_object(
        'name', s.name
      ) AS subsidiary
    FROM document_numbers dn
    LEFT JOIN subsidiaries s ON s.id = dn.subsidiary_id
    ORDER BY dn.id
    OFFSET $1 LIMIT $2
  `,
    [offset, limit],
  );

  const count = await pool.query(`SELECT COUNT(*) FROM document_numbers`);

  return {
    rows: data.rows,
    count: Number(count.rows[0].count),
  };
};

/* GET BY ID */
exports.getById = async (id) => {
  const res = await pool.query(
    `
    SELECT
      dn.*,
      json_build_object(
        'name', s.name
      ) AS subsidiary
    FROM document_numbers dn
    LEFT JOIN subsidiaries s ON s.id = dn.subsidiary_id
    WHERE dn.id = $1
  `,
    [id],
  );

  return res.rows[0];
};

/* UPDATE */
exports.update = async (id, data) => {
  const fields = [];
  const values = [];
  let idx = 1;

  for (const key in data) {
    fields.push(`${key} = $${idx++}`);
    values.push(data[key]);
  }

  values.push(id);

  const res = await pool.query(
    `
    UPDATE document_numbers
    SET ${fields.join(", ")}, updated_at = now()
    WHERE id = $${idx}
    RETURNING *
  `,
    values,
  );

  return res.rows[0];
};

/* DELETE */
exports.remove = async (id) => {
  const res = await pool.query(
    `DELETE FROM document_numbers WHERE id = $1 RETURNING *`,
    [id],
  );
  return res.rows[0];
};
