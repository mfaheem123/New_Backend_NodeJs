const db = require("../db"); // your mysql connection

const FareConfiguration = {
  // ✅ CREATE
  async create(data) {
    const {
      vehicle_type_id,
      account_id,
      from_day,
      to_day,
      from_time,
      to_time,
      minimum_fares,
      minimum_miles,
      from_date,
      to_date,
      title,
    } = data;

    const query = `
    INSERT INTO fare_configurations (
      vehicle_type_id,
      account_id,
      from_day,
      to_day,
      from_time,
      to_time,
      minimum_fares,
      minimum_miles,
      from_date,
      to_date,
      title
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

    const values = [
      vehicle_type_id,
      account_id,
      from_day,
      to_day,
      from_time,
      to_time,
      minimum_fares,
      minimum_miles,
      from_date || null,
      to_date || null,
      title,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // ✅ READ ALL
  async getAll(title) {
    let query = `
    SELECT 
      f.*, 
      vt.name AS vehicle_type_name, 
      vt.minimum_fares AS vehicle_minimum_fare,
      a.name AS account_name
    FROM fare_configurations f
    LEFT JOIN vehicle_types vt ON vt.id = f.vehicle_type_id
    LEFT JOIN accounts a ON a.id = f.account_id
  `;
    const params = [];

    if (title) {
      if (title.toLowerCase() === "normal") {
        // 🟢 For NORMAL → get records where title IS NULL or ''
        query += ` WHERE f.title IS NULL OR TRIM(f.title) = ''`;
      } else if (title.toLowerCase() === "special") {
        // 🟢 For SPECIAL → get records where title is NOT NULL and NOT empty
        query += ` WHERE f.title IS NOT NULL AND TRIM(f.title) <> ''`;
      }
    }

    query += " ORDER BY f.id DESC";

    const result = await db.query(query, params);

    // 🧩 Transform flat rows into nested structure
    return result.rows.map((row) => ({
      id: row.id,
      vehicle_type_id: row.vehicle_type_id,
      account_id: row.account_id,
      from_day: row.from_day,
      to_day: row.to_day,
      from_time: row.from_time,
      to_time: row.to_time,
      minimum_fares: Number(row.minimum_fares),
      minimum_miles: Number(row.minimum_miles),
      from_date: row.from_date,
      to_date: row.to_date,
      title: row.title,
      vehicle_type: row.vehicle_type_id
        ? {
            minimum_fares: Number(row.vehicle_minimum_fare),
            name: row.vehicle_type_name,
          }
        : null,
      account: row.account_id
        ? {
            name: row.account_name,
          }
        : null,
    }));
  },

  // ✅ GET BY ID
  async getById(id) {
    const result = await db.query(
      `
    SELECT 
      f.*, 
      vt.name AS vehicle_type_name, 
      vt.minimum_fares AS vehicle_minimum_fare,
      a.name AS account_name
    FROM fare_configurations f
    LEFT JOIN vehicle_types vt ON vt.id = f.vehicle_type_id
    LEFT JOIN accounts a ON a.id = f.account_id
    WHERE f.id = $1
    `,
      [id]
    );

    const row = result.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      vehicle_type_id: row.vehicle_type_id,
      account_id: row.account_id,
      from_day: row.from_day,
      to_day: row.to_day,
      from_time: row.from_time,
      to_time: row.to_time,
      minimum_fares: Number(row.minimum_fares),
      minimum_miles: Number(row.minimum_miles),
      from_date: row.from_date,
      to_date: row.to_date,
      title: row.title,
      vehicle_type: row.vehicle_type_id
        ? {
            minimum_fares: Number(row.vehicle_minimum_fare),
            name: row.vehicle_type_name,
          }
        : null,
      account: row.account_id
        ? {
            name: row.account_name,
          }
        : null,
    };
  },

  // ✅ UPDATE
  async update(id, data) {
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      // Skip undefined fields
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    // No valid fields
    if (fields.length === 0) {
      throw new Error("No valid fields provided for update");
    }

    // Add id at end
    values.push(id);

    const query = `
    UPDATE fare_configurations
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *;
  `;

    const { rows } = await db.query(query, values);
    return rows[0];
  },

  // ✅ DELETE
  async delete(id) {
    const result = await db.query(
      `DELETE FROM fare_configurations WHERE id = $1`,
      [id]
    );
    return result.rowCount > 0; // true if a row was deleted
  },
};

module.exports = FareConfiguration;
