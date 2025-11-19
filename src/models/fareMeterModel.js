const pool = require("../db");

module.exports = {
  async getAll() {
    const query = `
      SELECT fm.*, vt.name AS vehicle_type
      FROM fare_meters fm
      LEFT JOIN vehicle_types vt ON vt.id = fm.vehicle_type_id
      ORDER BY fm.id ASC;
    `;
    return pool.query(query);
  },

  async getById(id) {
    const query = `
      SELECT fm.*, vt.name AS vehicle_type
      FROM fare_meters fm
      LEFT JOIN vehicle_types vt ON vt.id = fm.vehicle_type_id
      WHERE fm.id = $1;
    `;
    return pool.query(query, [id]);
  },

  async create(data) {
    const query = `
      INSERT INTO fare_meters
      (vehicle_type_id, has_meter, autostart_wait, autostart_waiting_speed_limit,
       autostart_waiting_time, autostop_waiting_speed_limit, waiting_charges,
       waiting_intervals)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *;
    `;
    const values = [
      data.vehicle_type_id,
      data.has_meter,
      data.autostart_wait,
      data.autostart_waiting_speed_limit,
      data.autostart_waiting_time,
      data.autostop_waiting_speed_limit,
      JSON.stringify(data.waiting_charges || []),
      data.waiting_intervals,
    ];
    return pool.query(query, values);
  },

 async update(id, data) {
  // Build dynamic query
  let fields = [];
  let values = [];
  let index = 1;

  if (data.vehicle_type_id !== undefined) {
    fields.push(`vehicle_type_id = $${index++}`);
    values.push(data.vehicle_type_id);
  }

  if (data.has_meter !== undefined) {
    fields.push(`has_meter = $${index++}`);
    values.push(data.has_meter);
  }

  if (data.autostart_wait !== undefined) {
    fields.push(`autostart_wait = $${index++}`);
    values.push(data.autostart_wait);
  }

  if (data.autostart_waiting_speed_limit !== undefined) {
    fields.push(`autostart_waiting_speed_limit = $${index++}`);
    values.push(data.autostart_waiting_speed_limit);
  }

  if (data.autostart_waiting_time !== undefined) {
    fields.push(`autostart_waiting_time = $${index++}`);
    values.push(data.autostart_waiting_time);
  }

  if (data.autostop_waiting_speed_limit !== undefined) {
    fields.push(`autostop_waiting_speed_limit = $${index++}`);
    values.push(data.autostop_waiting_speed_limit);
  }

  if (data.waiting_charges !== undefined) {
    fields.push(`waiting_charges = $${index++}`);
    values.push(JSON.stringify(data.waiting_charges));
  }

  if (data.waiting_intervals !== undefined) {
    fields.push(`waiting_intervals = $${index++}`);
    values.push(data.waiting_intervals);
  }

  // always update updated_at
  fields.push(`updated_at = CURRENT_TIMESTAMP`);

  const query = `
    UPDATE fare_meters
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *;
  `;

  values.push(id);

  return pool.query(query, values);
},


  async delete(id) {
    const query = `DELETE FROM fare_meters WHERE id = $1 RETURNING *;`;
    return pool.query(query, [id]);
  },
};
