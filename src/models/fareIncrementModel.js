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
    [id],
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
  const fields = [];
  const values = [];
  let index = 1;

  for (const key in data) {
    if (data[key] !== undefined) {
      fields.push(`${key} = $${index}`);
      values.push(data[key]);
      index++;
    }
  }

  // agar kuch update hi nahi bheja
  if (fields.length === 0) {
    throw new Error("No fields provided for update");
  }

  const query = `
    UPDATE fare_increments
    SET ${fields.join(", ")},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $${index}
    RETURNING id,
              TO_CHAR(start_date, 'DD-MM-YYYY') AS start_date,
              TO_CHAR(end_date, 'DD-MM-YYYY') AS end_date,
              operator, amount, fix_fare, mileage;
  `;

  values.push(id);

  const result = await pool.query(query, values);
  return result.rows[0];
};


// DELETE
exports.delete = async (id) => {
  const result = await pool.query(
    "DELETE FROM fare_increments WHERE id = $1 RETURNING id",
    [id]
  );

  if (result.rowCount === 0) {
    throw new Error("Fare increment not found");
  }

  return true;
};

