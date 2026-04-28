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
      per_mile_fares,
      company_id,
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
      title,
      per_mile_fares,
      company_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12 ,$13)
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
      per_mile_fares || 0.0,
      company_id || 1,
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  },

  // ✅ READ ALL
  async getAll(title, company_id) {
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

  const conditions = [];
  const params = [];

  // 🔹 Title filter
  if (title) {
    if (title.toLowerCase() === "normal") {
      conditions.push(`(f.title IS NULL OR TRIM(f.title) = '')`);
    } else if (title.toLowerCase() === "special") {
      conditions.push(`(f.title IS NOT NULL AND TRIM(f.title) <> '')`);
    }
  }

  // 🔹 Company filter
  if (company_id) {
    params.push(company_id);
    conditions.push(`f.company_id = $${params.length}`);
  }

  // 🔹 Apply WHERE only once
  if (conditions.length > 0) {
    query += ` WHERE ` + conditions.join(" AND ");
  }

  query += " ORDER BY f.id DESC";

  const result = await db.query(query, params);

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
    per_mile_fares: Number(row.per_mile_fares),
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
      [id],
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
      per_mile_fares: Number(row.per_mile_fares),
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
      if (value !== undefined) {
        fields.push(`${key} = $${index}`);
        values.push(value);
        index++;
      }
    }

    if (fields.length === 0) {
      throw new Error("No valid fields provided for update");
    }

    values.push(id);

    const query = `
    UPDATE fare_configurations
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *;
  `;

    const { rows } = await db.query(query, values);

    // 🔴 IMPORTANT CHECK
    if (rows.length === 0) {
      throw new Error("Fare configuration not found");
    }

    return rows[0];
  },

  // ✅ DELETE
  async delete(id) {
    const result = await db.query(
      `DELETE FROM fare_configurations WHERE id = $1`,
      [id],
    );
    return result.rowCount > 0; // true if a row was deleted
  },

  // ✅ GET BY VEHICLE TYPE ID
  async getByVehicleTypeId(vehicle_type_id) {
    const query = `
    SELECT 
      f.*, 
      vt.name AS vehicle_type_name, 
      vt.minimum_fares AS vehicle_minimum_fare,
      a.name AS account_name
    FROM fare_configurations f
    LEFT JOIN vehicle_types vt ON vt.id = f.vehicle_type_id
    LEFT JOIN accounts a ON a.id = f.account_id
    WHERE f.vehicle_type_id = $1
    ORDER BY f.id DESC;
  `;

    const result = await db.query(query, [vehicle_type_id]);

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
      per_mile_fares: Number(row.per_mile_fares),
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
};

module.exports = FareConfiguration;
