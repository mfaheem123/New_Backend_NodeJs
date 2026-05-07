const pool = require("../db");

const FixedFare = {
  // ✅ CREATE MULTIPLE FIXED FARES
  async create(fixedFares) {
    const insertQuery = `
    INSERT INTO fixed_fares 
    (vehicle_type_id, area1, area2, fares, from_location_id, to_location_id, company_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
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
        fare.company_id,
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
      const { company_id, ...rest } = rows[0];
      createdFares.push(rest);
    }

    return createdFares;
  },

  // ✅ READ ALL (with pagination)
  async getAll({
    offset = 0,
    limit = 10,
    vehicle_type_name,
    fares,
    area1,
    area2,
    company_id,
  }) {
    let baseQuery = `
    FROM fixed_fares f
    JOIN vehicle_types vt ON f.vehicle_type_id = vt.id
    JOIN location_types fl ON f.from_location_id = fl.id
    JOIN location_types tl ON f.to_location_id = tl.id
  `;

    let conditions = [];
    let values = [];
    let index = 1;

    if (vehicle_type_name) {
      conditions.push(`LOWER(vt.name) LIKE LOWER($${index++})`);
      values.push(`%${vehicle_type_name}%`);
    }

    if (fares) {
      conditions.push(`CAST(f.fares AS TEXT) LIKE $${index++}`);
      values.push(`%${fares}%`);
    }

    if (area1) {
      conditions.push(`LOWER(f.area1) LIKE LOWER($${index++})`);
      values.push(`%${area1}%`);
    }

    if (area2) {
      conditions.push(`LOWER(f.area2) LIKE LOWER($${index++})`);
      values.push(`%${area2}%`);
    }
    if (company_id) {
    conditions.push(`f.company_id = $${index++}`);
    values.push(company_id);
  }

    let whereClause = "";
    if (conditions.length > 0) {
      whereClause = " WHERE " + conditions.join(" AND ");
    }

    // 🔹 Get Total Count
    const countQuery = `SELECT COUNT(*) ${baseQuery} ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const totalRecords = parseInt(countResult.rows[0].count);

    // 🔹 Get Paginated Data
    const dataQuery = `
    SELECT 
      f.*,
      vt.name AS vehicle_type_name,
      fl.name AS from_location_name,
      tl.name AS to_location_name
    ${baseQuery}
    ${whereClause}
    ORDER BY f.id DESC
    OFFSET $${index++} LIMIT $${index}
  `;

    const dataValues = [...values, offset, limit];
    const { rows } = await pool.query(dataQuery, dataValues);

    const cleanedRows = rows.map(({ company_id, ...rest }) => rest);

  return { rows: cleanedRows, totalRecords };
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
