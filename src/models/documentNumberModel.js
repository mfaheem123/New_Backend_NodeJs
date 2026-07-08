const pool = require("../db");

/* CREATE */
exports.create = async (data) => {
  let {
    subsidiary_id,
    document_table,
    document_column,
    prefix,
    start_number,
    end_number,
    increment_value,
    auto_increment,
    company_id,
  } = data;

  if (end_number == null) {
    end_number = start_number;
  }

  prefix = prefix.toLowerCase();

  // ✅ Duplicate Check
  const exists = await pool.query(
    `
    SELECT id
    FROM document_numbers
    WHERE subsidiary_id = $1
      AND document_table = $2
    `,
    [subsidiary_id, document_table],
  );

  if (exists.rows.length) {
    throw new Error("Document number already exists.");
  }

  const res = await pool.query(
    `
    INSERT INTO document_numbers
    (
      subsidiary_id,
      document_table,
      document_column,
      prefix,
      start_number,
      end_number,
      increment_value,
      auto_increment,
      company_id
    )
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
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
      company_id,
    ],
  );

  return res.rows[0];
};

/* GET ALL (WITH PAGINATION + JOIN) */
exports.getAll = async ({ offset = 0, limit = 100, company_id }) => {
  const data = await pool.query(
    `
    SELECT
      dn.id,
      dn.subsidiary_id,
      dn.document_table,
      dn.document_column,
      dn.prefix,
      dn.start_number,
      dn.end_number,
      dn.increment_value,
      dn.auto_increment,
      dn.created_at,
      dn.updated_at,
      json_build_object(
        'name', s.name
      ) AS subsidiary
    FROM document_numbers dn
    LEFT JOIN subsidiaries s ON s.id = dn.subsidiary_id
    WHERE dn.company_id = $3
    ORDER BY dn.id
    OFFSET $1 LIMIT $2
  `,
    [offset, limit, company_id],
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
  const allowedFields = [
    "subsidiary_id",
    "document_table",
    "document_column",
    "prefix",
    "start_number",
    "end_number",
    "increment_value",
    "auto_increment",
  ];

  const fields = [];
  const values = [];

  let i = 1;

  for (const key of allowedFields) {
    if (data[key] !== undefined) {
      if (key == "prefix") {
        values.push(data[key].toLowerCase());
      } else {
        values.push(data[key]);
      }

      fields.push(`${key}=$${i++}`);
    }
  }

  if (fields.length === 0) {
    throw new Error("Nothing to update.");
  }

  values.push(id);

  const result = await pool.query(
    `
        UPDATE document_numbers
        SET
            ${fields.join(",")},
            updated_at=NOW()
        WHERE id=$${i}
        RETURNING *
    `,
    values,
  );

  return result.rows[0];
};

/* DELETE */
exports.remove = async (id) => {
  const res = await pool.query(
    `DELETE FROM document_numbers WHERE id = $1 RETURNING *`,
    [id],
  );
  return res.rows[0];
};
