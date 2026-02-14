const pool = require("../db");

// Create a new zone
const Zone = {
  
  create: async (data) => {
    const query = `
      INSERT INTO zones (name, secondary_name, type, category, vertices, base, overlay)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      data.name,
      data.secondary_name,
      data.type,
      data.category,
      JSON.stringify(data.vertices),
      data.base,
      data.overlay,
    ];
    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Get all zones
  getAll: async ({
    page = 1,
    limit = 10,
    name,
    secondary_name,
    type,
    category,
  }) => {
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];
    let idx = 1;

    // 🔍 Apply filters dynamically
    if (name) {
      conditions.push(`z.name ILIKE $${idx++}`);
      params.push(`%${name}%`);
    }
    if (secondary_name) {
      conditions.push(`z.secondary_name ILIKE $${idx++}`);
      params.push(`%${secondary_name}%`);
    }
    if (type) {
      conditions.push(`z.type ILIKE $${idx++}`);
      params.push(`%${type}%`);
    }
    if (category) {
      conditions.push(`z.category ILIKE $${idx++}`);
      params.push(`%${category}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // --- Count Query ---
    const countQuery = `
    SELECT COUNT(*) AS total
    FROM zones z
    ${whereClause};
  `;
    const countResult = await pool.query(countQuery, params);
    const total = Number(countResult.rows[0].total) || 0;

    // --- Main Query ---
    params.push(limit, offset);
    const dataQuery = `
    SELECT 
      z.id,
      z.name,
      z.secondary_name,
      z.type,
      z.category,
      z.vertices,
      z.base,
      z.overlay,
      z.created_at,
      z.updated_at
    FROM zones z
    ${whereClause}
    ORDER BY z.id ASC
    LIMIT $${params.length - 1} OFFSET $${params.length};
  `;

    const { rows } = await pool.query(dataQuery, params);
    return { zones: rows, total };
  },

  // Get zone by ID
  getById: async (id) => {
    const query = "SELECT * FROM zones WHERE id = $1";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // Update zone
  update: async (id, data) => {
    // Dynamic SET clause for partial updates
    const setClauses = [];
    const values = [];
    let index = 1;

    // List all updatable fields
    const fields = [
      "name",
      "secondary_name",
      "type",
      "category",
      "vertices",
      "base",
      "overlay",
    ];

    for (const key of fields) {
      if (data[key] !== undefined) {
        setClauses.push(`${key}=$${index}`);
        values.push(key === "vertices" ? JSON.stringify(data[key]) : data[key]);
        index++;
      }
    }

    if (setClauses.length === 0) return null; // nothing to update

    const query = `
    UPDATE zones
    SET ${setClauses.join(", ")}, updated_at=now()
    WHERE id=$${index}
    RETURNING *;
  `;
    values.push(id);

    const { rows } = await pool.query(query, values);
    return rows[0];
  },

  // Delete zone
  delete: async (id) => {
    const query = "DELETE FROM zones WHERE id = $1 RETURNING *";
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },
};

module.exports = Zone;
