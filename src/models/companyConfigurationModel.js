const pool = require("../db");

exports.create = async (data) => {
  const checkQuery = `
    SELECT id
    FROM company_configurations
    WHERE subsidiary_id = $1
  `;

  const existing = await pool.query(checkQuery, [data.subsidiary_id]);

  if (existing.rows.length > 0) {
    throw new Error("Configuration already exists for this subsidiary.");
  }

  const columns = Object.keys(data);
  const values = Object.values(data);

  const placeholders = values.map((_, index) => `$${index + 1}`);

  const query = `
      INSERT INTO company_configurations
      (${columns.join(",")})
      VALUES (${placeholders.join(",")})
      RETURNING *
    `;

  const { rows } = await pool.query(query, values);

  return rows[0];
};

exports.getAll = async (company_id) => {
  const query = `
    SELECT cc.*,
           s.name AS subsidiary_name
    FROM company_configurations cc
    LEFT JOIN subsidiaries s
           ON s.id = cc.subsidiary_id
    WHERE company_id = $1
    ORDER BY cc.id DESC
  `;

  const { rows } = await pool.query(query,[company_id]);

  return rows;
};

exports.getById = async (subsidiaryId) => {
  const query = `
      SELECT
        cc.*,
        s.name AS subsidiary_name
      FROM company_configurations cc
      LEFT JOIN subsidiaries s
      ON s.id = cc.subsidiary_id
      WHERE cc.subsidiary_id = $1
    `;

  const { rows } = await pool.query(query, [subsidiaryId]);

  return rows[0];
};

exports.update = async (subsidiaryId, data) => {

  const exists = await pool.query(
    `SELECT id
     FROM company_configurations
     WHERE subsidiary_id=$1`,
    [subsidiaryId]
  );

  if (!exists.rows.length) {
    throw new Error("Configuration not found.");
  }

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(
      ([_, value]) => value !== undefined
    )
  );

  const fields = Object.keys(filteredData);

  if (!fields.length) {
    throw new Error("Nothing to update.");
  }

  const values = Object.values(filteredData);

  const setClause = fields
    .map((field, index) => `${field}=$${index + 1}`)
    .join(", ");

  const query = `
      UPDATE company_configurations
      SET
        ${setClause},
        updated_at=CURRENT_TIMESTAMP
      WHERE subsidiary_id=$${fields.length + 1}
      RETURNING *
    `;

  const { rows } = await pool.query(query, [
    ...values,
    subsidiaryId,
  ]);

  return rows[0];
};

exports.delete = async (subsidiaryId) => {

  await pool.query(
    `DELETE FROM company_configurations
     WHERE subsidiary_id=$1`,
    [subsidiaryId]
  );

  return true;
};


exports.createOrUpdate = async (data) => {
  const { subsidiary_id } = data;

  if (!subsidiary_id) {
    throw new Error("subsidiary_id is required.");
  }

  // Check Existing Configuration
  const existing = await pool.query(
    `SELECT id
     FROM company_configurations
     WHERE subsidiary_id = $1`,
    [subsidiary_id]
  );

  // ==========================
  // INSERT
  // ==========================
  if (existing.rows.length === 0) {

    const columns = Object.keys(data);
    const values = Object.values(data);

    const placeholders = values.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO company_configurations
      (${columns.join(",")})
      VALUES (${placeholders.join(",")})
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);

    return {
      action: "created",
      data: rows[0]
    };
  }

  // ==========================
  // UPDATE
  // ==========================

  const filteredData = Object.fromEntries(
    Object.entries(data).filter(
      ([key, value]) =>
        key !== "subsidiary_id" &&
        value !== undefined
    )
  );

  if (!Object.keys(filteredData).length) {
    return {
      action: "nothing",
      data: existing.rows[0]
    };
  }

  const fields = Object.keys(filteredData);
  const values = Object.values(filteredData);

  const setClause = fields
    .map((field, index) => `${field}=$${index + 1}`)
    .join(", ");

  const query = `
      UPDATE company_configurations
      SET
        ${setClause},
        updated_at = CURRENT_TIMESTAMP
      WHERE subsidiary_id = $${fields.length + 1}
      RETURNING *
  `;

  const { rows } = await pool.query(query, [
    ...values,
    subsidiary_id,
  ]);

  return {
    action: "updated",
    data: rows[0]
  };
};