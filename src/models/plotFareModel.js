const pool = require("../db");

const PlotFare = {
  // ✅ Get All
  async getAll(offset = 0, limit = 100) {
    const query = `
      SELECT 
        pf.*, 
        vt.name AS vehicle_type_name,
        p1.id AS pickup_plot_id, p1.name AS pickup_plot_name,
        p2.id AS dropoff_plot_id, p2.name AS dropoff_plot_name
      FROM plot_fares pf
      JOIN vehicle_types vt ON vt.id = pf.vehicle_type_id
      JOIN zones p1 ON p1.id = pf.pickup_plot_id
      JOIN zones p2 ON p2.id = pf.dropoff_plot_id
      ORDER BY pf.id DESC
      OFFSET $1 LIMIT $2
    `;
    const { rows } = await pool.query(query, [offset, limit]);
    return rows;
  },

  // ✅ Create
  async create(data) {
    const { vehicle_type_id, pickup_plot_id, dropoff_plot_id, fares } = data;
    const insertQuery = `
      INSERT INTO plot_fares (vehicle_type_id, pickup_plot_id, dropoff_plot_id, fares)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const insertValues = [
      vehicle_type_id,
      pickup_plot_id,
      dropoff_plot_id,
      fares,
    ];
    const { rows } = await pool.query(insertQuery, insertValues);

    // Get the full joined record
    const id = rows[0].id;
    return await this.getById(id);
  },

  // ✅ Update
  async update(id, data) {
  const { vehicle_type_id, pickup_plot_id, dropoff_plot_id, fares } = data;

  const updateQuery = `
    UPDATE plot_fares
    SET 
      vehicle_type_id = COALESCE($1, vehicle_type_id),
      pickup_plot_id  = COALESCE($2, pickup_plot_id),
      dropoff_plot_id = COALESCE($3, dropoff_plot_id),
      fares           = COALESCE($4, fares),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    RETURNING id;
  `;

  const values = [
    vehicle_type_id ?? null,
    pickup_plot_id ?? null,
    dropoff_plot_id ?? null,
    fares ?? null,
    id,
  ];

  const { rows } = await pool.query(updateQuery, values);

  if (!rows.length) return null;

  // Return full joined row
  return await this.getById(id);
},


  // ✅ Delete
  async delete(id) {
    const query = `DELETE FROM plot_fares WHERE id = $1 RETURNING *;`;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },

  // ✅ Get By ID (Used internally by create/update)
  async getById(id) {
    const query = `
      SELECT 
        pf.*, 
        vt.name AS vehicle_type_name,
        p1.id AS pickup_plot_id, p1.name AS pickup_plot_name,
        p2.id AS dropoff_plot_id, p2.name AS dropoff_plot_name
      FROM plot_fares pf
      JOIN vehicle_types vt ON vt.id = pf.vehicle_type_id
      JOIN zones p1 ON p1.id = pf.pickup_plot_id
      JOIN zones p2 ON p2.id = pf.dropoff_plot_id
      WHERE pf.id = $1;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  },
};

module.exports = PlotFare;
