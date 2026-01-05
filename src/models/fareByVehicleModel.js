const pool = require("../db");

// GET ALL FARES BY VEHICLE
exports.getAll = async (offset = 0, limit = 10) => {
  const query = `
    SELECT fbv.*, row_to_json(vt) as vehicle_type
    FROM fare_by_vehicles fbv
    LEFT JOIN vehicle_types vt ON fbv.vehicle_type_id = vt.id
    ORDER BY fbv.id ASC
    OFFSET $1 LIMIT $2
  `;
  const result = await pool.query(query, [offset, limit]);
  return result.rows;
};

// COUNT TOTAL
exports.getCount = async () => {
  const result = await pool.query(`SELECT COUNT(*) FROM fare_by_vehicles`);
  return parseInt(result.rows[0].count);
};

// CREATE NEW FARE BY VEHICLE
exports.create = async (data) => {
  const { vehicle_type_id, operator, value } = data;

  // 1️⃣ Insert data
  const insertQuery = `
    INSERT INTO fare_by_vehicles (vehicle_type_id, operator, value, created_at)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
    RETURNING *;
  `;
  const insertResult = await pool.query(insertQuery, [
    vehicle_type_id,
    operator,
    value,
  ]);

  const inserted = insertResult.rows[0];

  // 2️⃣ Fetch joined vehicle_type like GET ALL
  const joinQuery = `
    SELECT fbv.*, row_to_json(vt) AS vehicle_type
    FROM fare_by_vehicles fbv
    LEFT JOIN vehicle_types vt ON fbv.vehicle_type_id = vt.id
    WHERE fbv.id = $1;
  `;
  const fullResult = await pool.query(joinQuery, [inserted.id]);

  return fullResult.rows[0];
};

// UPDATE FARE BY VEHICLE
exports.update = async (id, data) => {
  // If no fields provided
  if (!data || Object.keys(data).length === 0) return null;

  const fields = [];
  const values = [];
  let index = 1;

  // ✅ Dynamically build SET query
  for (const key in data) {
    fields.push(`${key} = $${index}`);
    values.push(data[key]);
    index++;
  }

  // Add updated_at
  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateQuery = `
    UPDATE fare_by_vehicles
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *;
  `;

  values.push(id);

  const updateResult = await pool.query(updateQuery, values);
  const updated = updateResult.rows[0];

  if (!updated) return null;

  // 🔄 JOIN DATA LIKE GET ALL
  const joinQuery = `
    SELECT fbv.*, row_to_json(vt) AS vehicle_type
    FROM fare_by_vehicles fbv
    LEFT JOIN vehicle_types vt ON fbv.vehicle_type_id = vt.id
    WHERE fbv.id = $1;
  `;
  const fullResult = await pool.query(joinQuery, [id]);

  return fullResult.rows[0];
};

// DELETE FARE BY VEHICLE
exports.remove = async (id) => {
  const query = `DELETE FROM fare_by_vehicles WHERE id = $1 RETURNING *;`;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// GET SINGLE FARE BY ID
exports.getById = async (id) => {
  const query = `
    SELECT fbv.*, row_to_json(vt) as vehicle_type
    FROM fare_by_vehicles fbv
    LEFT JOIN vehicle_types vt ON fbv.vehicle_type_id = vt.id
    WHERE fbv.id = $1;
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};
