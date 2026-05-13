const db = require("../db");

// CREATE
const createHistory = async (data) => {
  const query = `
    INSERT INTO driver_shift_histories (
      driver_id,
      login_date,
      login_time,
      login_latitude,
      login_longitude,
      logout_date,
      logout_time,
      logout_latitude,
      logout_longitude,
      booking
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING *;
  `;

  const values = [
    data.driver_id,
    data.login_date,
    data.login_time,
    data.login_latitude,
    data.login_longitude,
    data.logout_date,
    data.logout_time,
    data.logout_latitude,
    data.logout_longitude,
    data.booking,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
};

// GET ALL WITH FILTERS
const getHistories = async (filters) => {
  let query = `
    SELECT *
    FROM driver_shift_histories
    WHERE 1=1
  `;

  const values = [];
  let count = 1;

  if (filters.driver_id) {
    query += ` AND driver_id = $${count}`;
    values.push(filters.driver_id);
    count++;
  }

  if (filters.from_date && filters.to_date) {
    query += ` AND login_date BETWEEN $${count} AND $${count + 1}`;
    values.push(filters.from_date, filters.to_date);
    count += 2;
  }

  if (filters.from_time && filters.to_time) {
    query += ` AND login_time BETWEEN $${count} AND $${count + 1}`;
    values.push(filters.from_time, filters.to_time);
    count += 2;
  }

  query += ` ORDER BY id DESC`;

  const result = await db.query(query, values);

  return result.rows;
};

// GET SINGLE
const getHistoryById = async (id) => {
  const query = `
    SELECT *
    FROM driver_shift_histories
    WHERE id = $1
  `;

  const result = await db.query(query, [id]);

  return result.rows[0];
};

// UPDATE
const updateHistory = async (id, data) => {
  const query = `
    UPDATE driver_shift_histories
    SET
      driver_id = $1,
      login_date = $2,
      login_time = $3,
      login_latitude = $4,
      login_longitude = $5,
      logout_date = $6,
      logout_time = $7,
      logout_latitude = $8,
      logout_longitude = $9,
      booking = $10,
      updated_at = NOW()
    WHERE id = $11
    RETURNING *;
  `;

  const values = [
    data.driver_id,
    data.login_date,
    data.login_time,
    data.login_latitude,
    data.login_longitude,
    data.logout_date,
    data.logout_time,
    data.logout_latitude,
    data.logout_longitude,
    data.booking,
    id,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
};

// DELETE
const deleteHistory = async (id) => {
  const query = `
    DELETE FROM driver_shift_histories
    WHERE id = $1
    RETURNING *;
  `;

  const result = await db.query(query, [id]);

  return result.rows[0];
};

// CREATE LOGIN SHIFT
const createLoginShift = async (driver_id, latitude, longitude) => {
  const query = `
    INSERT INTO driver_shift_histories (
      driver_id,
      login_date,
      login_time,
      login_latitude,
      login_longitude
    )
    VALUES (
      $1,

      TO_CHAR(NOW(), 'YYYY-MM-DD'),
      TO_CHAR(NOW(), 'HH24:MI'),

      $2,
      $3
    )

    RETURNING *;
  `;

  const values = [driver_id, latitude, longitude];

  const result = await db.query(query, values);

  return result.rows[0];
};

// GET ACTIVE SHIFT
const getActiveShift = async (driver_id) => {
  const query = `
    SELECT *
    FROM driver_shift_histories
    WHERE driver_id = $1
    AND logout_time IS NULL
    ORDER BY id DESC
    LIMIT 1
  `;

  const result = await db.query(query, [driver_id]);

  return result.rows[0];
};

// UPDATE LOGOUT SHIFT
const updateLogoutShift = async (
  driver_id,
  latitude,
  longitude
) => {

  const activeShift = await getActiveShift(driver_id);

  if (!activeShift) {
    return null;
  }

  const query = `
    UPDATE driver_shift_histories
    SET

      logout_date = TO_CHAR(NOW(), 'YYYY-MM-DD'),
      logout_time = TO_CHAR(NOW(), 'HH24:MI'),

      logout_latitude = $1,
      logout_longitude = $2,

      updated_at = NOW()

    WHERE id = $3

    RETURNING *;
  `;

  const values = [
    latitude,
    longitude,
    activeShift.id,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
};

module.exports = {
  createHistory,
  getHistories,
  getHistoryById,
  updateHistory,
  deleteHistory,
  createLoginShift,
  updateLogoutShift,
  getActiveShift,
};
