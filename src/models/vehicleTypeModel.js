const pool = require("../db");

const VehicleType = {
  async getAll({ offset = 0, limit = 100, filters = {} }) {
    const {
      name,
      passengers,
      luggages,
      hand_luggages,
      minimum_fares,
      minimum_miles,
      company_id,
    } = filters;

    const conditions = [];
    const params = [];
    let idx = 1;

    // 🔹 Filters
    if (name) {
      conditions.push(`vt.name ILIKE $${idx++}`);
      params.push(`%${name}%`);
    }
    if (passengers) {
      conditions.push(`CAST(vt.passengers AS TEXT) ILIKE $${idx++}`);
      params.push(`%${passengers}%`);
    }
    if (luggages) {
      conditions.push(`CAST(vt.luggages AS TEXT) ILIKE $${idx++}`);
      params.push(`%${luggages}%`);
    }
    if (hand_luggages) {
      conditions.push(`CAST(vt.hand_luggages AS TEXT) ILIKE $${idx++}`);
      params.push(`%${hand_luggages}%`);
    }
    if (minimum_fares) {
      conditions.push(`CAST(vt.minimum_fares AS TEXT) ILIKE $${idx++}`);
      params.push(`%${minimum_fares}%`);
    }
    if (minimum_miles) {
      conditions.push(`CAST(vt.minimum_miles AS TEXT) ILIKE $${idx++}`);
      params.push(`%${minimum_miles}%`);
    }
    if (company_id) {
      conditions.push(`vt.company_id = $${idx++}`);
      params.push(company_id);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // 🔹 Count Query
    const countQuery = `
    SELECT COUNT(*) AS total
    FROM vehicle_types vt
    ${whereClause};
  `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total) || 0;

    // 🔥 MAIN FIX: company_id exclude
    const dataQuery = `
    SELECT 
      vt.id,
      vt.name,
      vt.passengers,
      vt.luggages,
      vt.hand_luggages,
      vt.minimum_fares,
      vt.minimum_miles,
      vt.waiting_time,
      vt.waiting_time_duration,
      vt.default_vehicle,
      vt.vehicle_type_minimum_fares,
      vt.image,
      vt.created_at,
      vt.updated_at,
      vt.background_color,
      vt.foreground_color,
      vt.driver_waiting_charges,
      vt.account_waiting_charges
    FROM vehicle_types vt
    ${whereClause}
    ORDER BY vt.id ASC
    OFFSET $${idx++} LIMIT $${idx++};
  `;

    params.push(offset, limit);

    const result = await pool.query(dataQuery, params);

    return { vehicle_types: result.rows, total };
  },

  async getById(id) {
    const result = await pool.query(
      "SELECT * FROM vehicle_types WHERE id = $1",
      [id],
    );
    return result.rows[0];
  },

  async create(data) {
    const {
      name,
      passengers,
      luggages,
      hand_luggages,
      minimum_fares,
      minimum_miles,
      background_color,
      foreground_color,
      driver_waiting_charges,
      account_waiting_charges,
      waiting_time,
      waiting_time_duration,
      default_vehicle,
      vehicle_type_minimum_fares,
      image,
      company_id,
    } = data;

    const result = await pool.query(
      `INSERT INTO vehicle_types (
    name, passengers, luggages, hand_luggages,
    minimum_fares, minimum_miles, background_color, foreground_color,
    driver_waiting_charges, account_waiting_charges,
    waiting_time, waiting_time_duration,
    default_vehicle, vehicle_type_minimum_fares, image, company_id
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, $16)
  RETURNING 
    id,
    name,
    passengers,
    luggages,
    hand_luggages,
    minimum_fares,
    minimum_miles,
    waiting_time,
    waiting_time_duration,
    default_vehicle,
    vehicle_type_minimum_fares,
    image,
    created_at,
    updated_at,
    background_color,
    foreground_color,
    driver_waiting_charges,
    account_waiting_charges`,
      [
        name,
        passengers,
        luggages,
        hand_luggages,
        minimum_fares ?? 0,
        minimum_miles ?? 0,
        background_color,
        foreground_color,
        driver_waiting_charges,
        account_waiting_charges,
        waiting_time,
        waiting_time_duration,
        default_vehicle,
        vehicle_type_minimum_fares,
        image,
        company_id,
      ],
    );
    const vehicle = result.rows[0];
    const vehicleTypeId = vehicle.id;
    // 2️⃣ CREATE DEFAULT FARE METER FOR THIS VEHICLE
    await pool.query(
      `INSERT INTO fare_meters (
        vehicle_type_id, has_meter, autostart_wait,
        autostart_waiting_speed_limit, autostart_waiting_time,
        autostop_waiting_speed_limit, waiting_charges, waiting_intervals, company_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        vehicleTypeId, // new vehicle ID
        false, // has_meter
        false, // autostart_wait
        0, // autostart_waiting_speed_limit
        0, // autostart_waiting_time
        0, // autostop_waiting_speed_limit
        JSON.stringify([]), // waiting_charges
        0, // waiting_intervals
        company_id ?? 1,
      ],
    );
    return result.rows[0];
  },

  async update(id, data) {
    const cols = Object.keys(data);
    if (cols.length === 0) return this.getById(id);

    const set = cols.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const values = Object.values(data);
    values.push(id);

    const result = await pool.query(
      `UPDATE vehicle_types 
       SET ${set}, updated_at = now() 
       WHERE id = $${values.length} RETURNING *`,
      values,
    );
    return result.rows[0];
  },

  async delete(id) {
    const result = await pool.query(
      "DELETE FROM vehicle_types WHERE id = $1 RETURNING *",
      [id],
    );
    return result.rows[0];
  },

  async findByName(name, company_id) {
    const result = await pool.query(
      `
    SELECT *
    FROM vehicle_types
    WHERE LOWER(name)=LOWER($1)
      AND company_id=$2
    LIMIT 1
    `,
      [name, company_id],
    );

    return result.rows[0];
  },

  async exists(id) {
    const result = await pool.query(
      `SELECT id FROM vehicle_types WHERE id = $1`,
      [id],
    );
    return result.rowCount > 0;
  },
};

module.exports = VehicleType;
