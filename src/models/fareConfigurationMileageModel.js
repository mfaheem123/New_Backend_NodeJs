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
      new Date() //updated_at
    ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// ---------------------------------------------------------
// GET ALL FARE CONFIGURATION MILEAGE
// ---------------------------------------------------------
const getAllFareConfigurationsMileage = async () => {
  const query = `
    SELECT * FROM fare_configuration_mileage
  `;
  const result = await pool.query(query);
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
// UPDATE FARE CONFIGURATION MILEAGE BY ID
// ---------------------------------------------------------
const updateFareConfigurationMileage = async (id, data) => {
  const query = `
    UPDATE fare_configuration_mileage
    SET company_id = $1, maximum_miles = $2, minimum_miles = $3, fares = $4, updated_at = $5
    WHERE id = $6
    RETURNING *
  `;
  const values = [
      data.company_id,
      data.maximum_miles,
      data.minimum_miles,
      data.fares,
      data.updated_at,
      id
    ];
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
  deleteFareConfigurationMileage
};



