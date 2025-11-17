const pool = require("../db");

// GET ALL
exports.getAll = async () => {
  const query = `
    SELECT id,
           TO_CHAR(start_date, 'DD-MM-YYYY') AS start_date,
           TO_CHAR(end_date, 'DD-MM-YYYY') AS end_date,
           operator,
           amount,
           fix_fare,
           mileage
    FROM fare_increments
    ORDER BY id DESC;
  `;
  const result = await pool.query(query);
  return result.rows;
};

// GET BY ID
exports.getById = async (id) => {
  const result = await pool.query(
    "SELECT * FROM fare_increments WHERE id = $1",
    [id]
  );
  return result.rows[0];
};

// CREATE
exports.create = async (data) => {
  const { start_date, end_date, operator, amount, fix_fare, mileage } = data;

  const query = `
    INSERT INTO fare_increments (start_date, end_date, operator, amount, fix_fare, mileage)
    VALUES (
    $1,$2,$3, $4, $5, $6)
    RETURNING id,
              TO_CHAR(start_date, 'DD-MM-YYYY') AS start_date,
              TO_CHAR(end_date, 'DD-MM-YYYY') AS end_date,
              operator, amount, fix_fare, mileage;
  `;

  const values = [start_date, end_date, operator, amount, fix_fare, mileage];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// UPDATE
exports.update = async (id, data) => {
  const { start_date, end_date, operator, amount, fix_fare, mileage } = data;

  const query = `
    UPDATE fare_increments
    SET start_date = $1,
        end_date = $2,
        operator = $3,
        amount = $4,
        fix_fare = $5,
        mileage = $6,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING id,
              TO_CHAR(start_date, 'DD-MM-YYYY') AS start_date,
              TO_CHAR(end_date, 'DD-MM-YYYY') AS end_date,
              operator, amount, fix_fare, mileage;
  `;

  const values = [
    start_date,
    end_date,
    operator,
    amount,
    fix_fare,
    mileage,
    id,
  ];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// DELETE
exports.delete = async (id) => {
  await pool.query("DELETE FROM fare_increments WHERE id = $1", [id]);
  return true;
};
