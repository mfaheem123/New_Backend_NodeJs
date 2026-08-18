const pool = require("../db");

const getEmployeeShiftHistory = async ({
  employee_id,
  from_date,
  to_date,
  from_time,
  to_time,
  search_login,
  search_logout,
  search_bookings_created,
  search_bookings_dispatched,
  search_bookings_cancelled,
  search_calls_answered,
}) => {
  let query = `
    SELECT 
      esh.id,
      esh.employee_id,
      esh.login_datetime,
      esh.logout_datetime,

      COALESCE(esh.bookings_created, 0) AS bookings_created,
      COALESCE(esh.bookings_dispatched, 0) AS bookings_dispatched,
      COALESCE(esh.bookings_cancelled, 0) AS bookings_cancelled,
      COALESCE(esh.calls_answered, 0) AS calls_answered,

      COALESCE(
        EXTRACT(EPOCH FROM (
          esh.logout_datetime - esh.login_datetime
        )) * 1000,
        0
      ) AS working_hours

    FROM employee_shift_history esh
    WHERE esh.employee_id = $1
  `;

  const values = [employee_id];
  let index = 2;

  // DATE FILTER
  if (from_date && to_date) {
    query += ` AND DATE(esh.login_datetime) BETWEEN $${index} AND $${index + 1}`;
    values.push(from_date, to_date);
    index += 2;
  }

  // TIME FILTER
  if (from_time && to_time) {
    query += ` AND TO_CHAR(esh.login_datetime, 'HH24:MI') BETWEEN $${index} AND $${index + 1}`;
    values.push(from_time, to_time);
    index += 2;
  }

  // --- INDIVIDUAL COLUMN SEARCH FILTERS ---

  // 1. LOGIN DATETIME SEARCH
  if (search_login) {
  query += ` AND (
    TO_CHAR(esh.login_datetime, 'DD-MM-YY HH24:MI:SS') ILIKE $${index}
    OR TO_CHAR(esh.login_datetime, 'YYYY-MM-DD HH24:MI:SS') ILIKE $${index}
  )`;
  values.push(`%${search_login}%`);
  index++;
}

if (search_logout) {
  query += ` AND (
    TO_CHAR(esh.logout_datetime, 'DD-MM-YY HH24:MI:SS') ILIKE $${index}
    OR TO_CHAR(esh.logout_datetime, 'YYYY-MM-DD HH24:MI:SS') ILIKE $${index}
  )`;
  values.push(`%${search_logout}%`);
  index++;
}

  // 3. BOOKINGS CREATED SEARCH
  if (search_bookings_created) {
    query += ` AND COALESCE(esh.bookings_created, 0)::text ILIKE $${index}`;
    values.push(`%${search_bookings_created}%`);
    index++;
  }

  // 4. BOOKINGS DISPATCHED SEARCH
  if (search_bookings_dispatched) {
    query += ` AND COALESCE(esh.bookings_dispatched, 0)::text ILIKE $${index}`;
    values.push(`%${search_bookings_dispatched}%`);
    index++;
  }

  // 5. BOOKINGS CANCELLED SEARCH
  if (search_bookings_cancelled) {
    query += ` AND COALESCE(esh.bookings_cancelled, 0)::text ILIKE $${index}`;
    values.push(`%${search_bookings_cancelled}%`);
    index++;
  }

  // 6. CALLS ANSWERED SEARCH
  if (search_calls_answered) {
    query += ` AND COALESCE(esh.calls_answered, 0)::text ILIKE $${index}`;
    values.push(`%${search_calls_answered}%`);
    index++;
  }

  query += ` ORDER BY esh.login_datetime ASC`;

  const { rows } = await pool.query(query, values);

  return rows;
};

// LOGIN ENTRY CREATE
const createLoginHistory = async (employee_id) => {
  const query = `
    INSERT INTO employee_shift_history (
      employee_id,
      login_datetime
    )
    VALUES ($1, NOW())
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [employee_id]);

  return rows[0];
};

// LAST ACTIVE SHIFT GET
const getActiveShift = async (employee_id) => {
  const query = `
    SELECT *
    FROM employee_shift_history
    WHERE employee_id = $1
    AND logout_datetime IS NULL
    ORDER BY id DESC
    LIMIT 1;
  `;

  const { rows } = await pool.query(query, [employee_id]);

  return rows[0];
};

// LOGOUT TIME UPDATE
const updateLogoutHistory = async (employee_id) => {
  const query = `
    UPDATE employee_shift_history
    SET logout_datetime = NOW()
    WHERE id = (
      SELECT id
      FROM employee_shift_history
      WHERE employee_id = $1
      AND logout_datetime IS NULL
      ORDER BY id DESC
      LIMIT 1
    )
    RETURNING *;
  `;

  const { rows } = await pool.query(query, [employee_id]);

  return rows[0];
};

module.exports = {
  getEmployeeShiftHistory,
  createLoginHistory,
  getActiveShift,
  updateLogoutHistory,
};
