const pool = require("../db");

const FixedFare = {
  // ✅ CREATE MULTIPLE FIXED FARES
 async create(fixedFares) {
  const insertQuery = `
    INSERT INTO fixed_fares 
    (vehicle_type_id, area1, area2, fares, from_location_id, to_location_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id;
  `;

  const createdFares = [];

  for (const fare of fixedFares) {
    const values = [
      fare.vehicle_type_id,
      fare.area1.toLowerCase(),
      fare.area2.toLowerCase(),
      fare.fares,
      fare.from_location_id,
      fare.to_location_id,
    ];

    const insertResult = await pool.query(insertQuery, values);
    const insertedId = insertResult.rows[0].id;

    // 🔥 Fetch with JOIN
    const selectQuery = `
      SELECT 
        f.*,
        vt.name AS vehicle_type_name,
        fl.name AS from_location_name,
        tl.name AS to_location_name
      FROM fixed_fares f
      LEFT JOIN vehicle_types vt ON f.vehicle_type_id = vt.id
      LEFT JOIN locations fl ON f.from_location_id = fl.id
      LEFT JOIN locations tl ON f.to_location_id = tl.id
      WHERE f.id = $1
    `;

    const { rows } = await pool.query(selectQuery, [insertedId]);
    createdFares.push(rows[0]);
  }

  return createdFares;
},


  // ✅ READ ALL (with pagination)
  async getAll(offset = 0, limit = 100) {
    const query = `
      SELECT 
      f.*,
      vt.name AS vehicle_type_name,
      fl.name AS from_location_name,
      tl.name AS to_location_name
    FROM fixed_fares f
    JOIN vehicle_types vt ON f.vehicle_type_id = vt.id
    JOIN location_types fl ON f.from_location_id = fl.id
    JOIN location_types tl ON f.to_location_id = tl.id
    ORDER BY f.id DESC
    OFFSET $1 LIMIT $2
    `;
    const { rows } = await pool.query(query, [offset, limit]);
    return rows;
  },

  // ✅ READ BY ID
  async getById(id) {
    const query = `
      SELECT f.*, vt.name AS vehicle_type_name
      FROM fixed_fares f
      JOIN vehicle_types vt ON f.vehicle_type_id = vt.id
      WHERE f.id = $1
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // ✅ UPDATE
  async update(id, data) {
  const allowedFields = [
    "vehicle_type_id",
    "fares",
    "area1",
    "area2",
    "from_location_id",
    "to_location_id",
  ];

  const setClauses = [];
  const values = [];
  let index = 1;

  for (const key of allowedFields) {
    if (data[key] !== undefined && data[key] !== null) {
      if (key === "area1" || key === "area2") {
        data[key] = data[key].toLowerCase();
      }
      setClauses.push(`${key} = $${index++}`);
      values.push(data[key]);
    }
  }

  if (setClauses.length === 0) {
    throw new Error("No valid fields provided to update");
  }

  setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

  const updateQuery = `
    UPDATE fixed_fares
    SET ${setClauses.join(", ")}
    WHERE id = $${index}
    RETURNING id;
  `;

  values.push(id);

  const updateResult = await pool.query(updateQuery, values);

  if (updateResult.rows.length === 0) {
    return null; // ID not found
  }

  // 🔥 Now fetch updated row with joins
  const selectQuery = `
     SELECT 
    f.*,
    vt.name AS vehicle_type_name,
    fl.name AS from_location_name,
    tl.name AS to_location_name
  FROM fixed_fares f
  LEFT JOIN vehicle_types vt ON f.vehicle_type_id = vt.id
  LEFT JOIN locations fl ON f.from_location_id = fl.id
  LEFT JOIN locations tl ON f.to_location_id = tl.id
  WHERE f.id = $1
  `;

  const { rows } = await pool.query(selectQuery, [id]);

  return rows[0];
},


  // ✅ DELETE
  async delete(id) {
    const { rows } = await pool.query(
      `DELETE FROM fixed_fares WHERE id = $1 RETURNING *`,
      [id],
    );
    return rows[0];
  },
};

module.exports = FixedFare;
