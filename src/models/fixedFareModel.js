const pool = require("../db");

const FixedFare = {
  // ✅ CREATE MULTIPLE FIXED FARES
  async create(fixedFares) {
    const query = `
      INSERT INTO fixed_fares (vehicle_type_id, area1, area2, fares, from_location_id, to_location_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
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
      const { rows } = await pool.query(query, values);
      createdFares.push(rows[0]);
    }
    return createdFares;
  },

  // ✅ READ ALL (with pagination)
  async getAll(offset = 0, limit = 10) {
    const query = `
      SELECT f.*, vt.name AS vehicle_type_name
      FROM fixed_fares f
      JOIN vehicle_types vt ON f.vehicle_type_id = vt.id
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
      if (data[key] !== undefined) {
        if (key === "area1" || key === "area2") {
          data[key] = data[key].toLowerCase();
        }
        setClauses.push(`${key} = $${index++}`);
        values.push(data[key]);
      }
    }

    // no fields to update
    if (setClauses.length === 0) {
      throw new Error("No valid fields provided to update");
    }

    // add updated_at
    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);

    const query = `
    UPDATE fixed_fares
    SET ${setClauses.join(", ")}
    WHERE id = $${index}
    RETURNING *;
  `;
    values.push(id);

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // ✅ DELETE
  async delete(id) {
    const { rows } = await pool.query(
      `DELETE FROM fixed_fares WHERE id = $1 RETURNING *`,
      [id]
    );
    return rows[0];
  },
};

module.exports = FixedFare;
