const pool = require("../db");

// ---------------------------------------------------------
// CREATE FARE CONFIGURATION MILEAGE
// ---------------------------------------------------------
const createFareConfigurationMileage = async (data) => {
  const query = `
    INSERT INTO fare_configuration_mileage (company_id, maximum_miles, minimum_miles, fares, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;
  const values = [
    data.company_id,
    data.maximum_miles,
    data.minimum_miles,
    data.fares,
    new Date(), //created_at
    new Date(), //updated_at
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// ---------------------------------------------------------
// GET ALL FARE CONFIGURATION MILEAGE
// ---------------------------------------------------------
const getAllFareConfigurationsMileage = async (company_id) => {
  const query = `
    SELECT * FROM fare_configuration_mileage
    WHERE company_id = $1
  `;
  const result = await pool.query(query, [company_id]);
  return result.rows;
};

// ---------------------------------------------------------
// GET FARE CONFIGURATION MILEAGE BY ID
// ---------------------------------------------------------
const getFareConfigurationMileageById = async (id) => {
  const query = `
    SELECT * FROM fare_configuration_mileage
    WHERE id = $1
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

// ---------------------------------------------------------
// UPDATE FARE CONFIGURATION MILEAGE BY ID (DYNAMIC)
// ---------------------------------------------------------
const updateFareConfigurationMileage = async (id, data) => {
  const fields = [];
  const values = [];
  let index = 1;

  // Sirf incoming defined fields ko include karein
  if (data.company_id !== undefined) {
    fields.push(`company_id = $${index++}`);
    values.push(data.company_id);
  }
  if (data.maximum_miles !== undefined) {
    fields.push(`maximum_miles = $${index++}`);
    values.push(data.maximum_miles);
  }
  if (data.minimum_miles !== undefined) {
    fields.push(`minimum_miles = $${index++}`);
    values.push(data.minimum_miles);
  }
  if (data.fares !== undefined) {
    fields.push(`fares = $${index++}`);
    values.push(data.fares);
  }

  // Agar payload me koi valid field hi na ho
  if (fields.length === 0) {
    throw new Error("No fields provided for update");
  }

  // Automatically updated_at set karein
  fields.push(`updated_at = $${index++}`);
  values.push(new Date());

  // WHERE condition ke liye ID bind karein
  values.push(id);

  const query = `
    UPDATE fare_configuration_mileage
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};

// ---------------------------------------------------------
// DELETE FARE CONFIGURATION MILEAGE BY ID
// ---------------------------------------------------------
const deleteFareConfigurationMileage = async (id) => {
  const query = `
    DELETE FROM fare_configuration_mileage
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows[0];
};

module.exports = {
  pool,
  createFareConfigurationMileage,
  getAllFareConfigurationsMileage,
  getFareConfigurationMileageById,
  updateFareConfigurationMileage,
  deleteFareConfigurationMileage,
};
