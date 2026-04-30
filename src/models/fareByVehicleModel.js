const pool = require("../db");

// GET ALL FARES BY VEHICLE
exports.getAll = async (company_id) => {
  const query = `
  SELECT 
    fbv.id,
    fbv.vehicle_type_id,
    fbv.operator,
    fbv.value,
    fbv.created_at,
    fbv.updated_at,
    json_build_object(
      'id', vt.id,
      'name', vt.name,
      'passengers', vt.passengers,
      'luggages', vt.luggages,
      'hand_luggages', vt.hand_luggages,
      'minimum_fares', vt.minimum_fares,
      'minimum_miles', vt.minimum_miles,
      'waiting_time', vt.waiting_time,
      'waiting_time_duration', vt.waiting_time_duration,
      'default_vehicle', vt.default_vehicle,
      'vehicle_type_minimum_fares', vt.vehicle_type_minimum_fares,
      'image', vt.image,
      'created_at', vt.created_at,
      'updated_at', vt.updated_at,
      'background_color', vt.background_color,
      'foreground_color', vt.foreground_color,
      'driver_waiting_charges', vt.driver_waiting_charges,
      'account_waiting_charges', vt.account_waiting_charges
    ) as vehicle_type
  FROM fare_by_vehicles fbv
  LEFT JOIN vehicle_types vt ON fbv.vehicle_type_id = vt.id
  WHERE fbv.company_id = $1
  ORDER BY fbv.id ASC
`;

  const result = await pool.query(query, [company_id]); // ✅ FIX
  return result.rows;
};

// COUNT TOTAL
exports.getCount = async (company_id) => {
  const result = await pool.query(
    `SELECT COUNT(*) FROM fare_by_vehicles WHERE company_id = $1`,
    [company_id] // ✅ FIX
  );
  return parseInt(result.rows[0].count);
};

// CREATE NEW FARE BY VEHICLE
exports.create = async (data) => {
  const { vehicle_type_id, operator, value, company_id } = data;

  // 1️⃣ Insert data
  const insertQuery = `
    INSERT INTO fare_by_vehicles (vehicle_type_id, operator, value, created_at, company_id)
    VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
    RETURNING *;
  `;
  const insertResult = await pool.query(insertQuery, [
    vehicle_type_id,
    operator,
    value,
    company_id || 1,
  ]);

  const inserted = insertResult.rows[0];

  // 2️⃣ Fetch joined vehicle_type like GET ALL
  const joinQuery = `
  SELECT 
    fbv.id,
    fbv.vehicle_type_id,
    fbv.operator,
    fbv.value,
    fbv.created_at,
    fbv.updated_at,
    json_build_object(
      'id', vt.id,
      'name', vt.name,
      'passengers', vt.passengers,
      'luggages', vt.luggages,
      'hand_luggages', vt.hand_luggages,
      'minimum_fares', vt.minimum_fares,
      'minimum_miles', vt.minimum_miles,
      'waiting_time', vt.waiting_time,
      'waiting_time_duration', vt.waiting_time_duration,
      'default_vehicle', vt.default_vehicle,
      'vehicle_type_minimum_fares', vt.vehicle_type_minimum_fares,
      'image', vt.image,
      'created_at', vt.created_at,
      'updated_at', vt.updated_at,
      'background_color', vt.background_color,
      'foreground_color', vt.foreground_color,
      'driver_waiting_charges', vt.driver_waiting_charges,
      'account_waiting_charges', vt.account_waiting_charges
    ) AS vehicle_type
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
