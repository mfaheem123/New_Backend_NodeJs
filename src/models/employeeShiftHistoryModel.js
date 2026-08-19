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
  page = 1,
  limit = 20,
}) => {
  let innerQuery = `
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
    innerQuery += ` AND DATE(esh.login_datetime) BETWEEN $${index} AND $${index + 1}`;
    values.push(from_date, to_date);
    index += 2;
  }

  // TIME FILTER
  if (from_time && to_time) {
    innerQuery += ` AND TO_CHAR(esh.login_datetime, 'HH24:MI') BETWEEN $${index} AND $${index + 1}`;
    values.push(from_time, to_time);
    index += 2;
  }

  // --- INDIVIDUAL COLUMN SEARCH FILTERS ---

  // 1. LOGIN DATETIME SEARCH
  if (search_login) {
    innerQuery += ` AND (
      TO_CHAR(esh.login_datetime, 'DD-MM-YY HH24:MI:SS') ILIKE $${index}
      OR TO_CHAR(esh.login_datetime, 'YYYY-MM-DD HH24:MI:SS') ILIKE $${index}
    )`;
    values.push(`%${search_login}%`);
    index++;
  }

  // 2. LOGOUT DATETIME SEARCH
  if (search_logout) {
    innerQuery += ` AND (
      TO_CHAR(esh.logout_datetime, 'DD-MM-YY HH24:MI:SS') ILIKE $${index}
      OR TO_CHAR(esh.logout_datetime, 'YYYY-MM-DD HH24:MI:SS') ILIKE $${index}
    )`;
    values.push(`%${search_logout}%`);
    index++;
  }

  // 3. BOOKINGS CREATED SEARCH
  if (search_bookings_created) {
    innerQuery += ` AND COALESCE(esh.bookings_created, 0)::text ILIKE $${index}`;
    values.push(`%${search_bookings_created}%`);
    index++;
  }

  // 4. BOOKINGS DISPATCHED SEARCH
  if (search_bookings_dispatched) {
    innerQuery += ` AND COALESCE(esh.bookings_dispatched, 0)::text ILIKE $${index}`;
    values.push(`%${search_bookings_dispatched}%`);
    index++;
  }

  // 5. BOOKINGS CANCELLED SEARCH
  if (search_bookings_cancelled) {
    innerQuery += ` AND COALESCE(esh.bookings_cancelled, 0)::text ILIKE $${index}`;
    values.push(`%${search_bookings_cancelled}%`);
    index++;
  }

  // 6. CALLS ANSWERED SEARCH
  if (search_calls_answered) {
    innerQuery += ` AND COALESCE(esh.calls_answered, 0)::text ILIKE $${index}`;
    values.push(`%${search_calls_answered}%`);
    index++;
  }

  // PAGINATION PARSING
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 20;
  const offset = (pageNum - 1) * limitNum;

  // CTE Wrapper for Safe Window Function Execution
  const fullQuery = `
    WITH main_query AS (
      ${innerQuery}
      ORDER BY esh.login_datetime ASC
    )
    SELECT *, COUNT(*) OVER() AS total_count
    FROM main_query
    LIMIT $${index} OFFSET $${index + 1}
  `;

  values.push(limitNum, offset);

  const { rows: resultRows } = await pool.query(fullQuery, values);

  const totalRecords = resultRows.length > 0 ? parseInt(resultRows[0].total_count, 10) : 0;

  // Cleanup total_count key from output objects
  const data = resultRows.map((row) => {
    const { total_count, ...record } = row;
    return record;
  });

  return {
    data,
    total: totalRecords,
    total_pages: Math.ceil(totalRecords / limitNum),
    page: pageNum,
    limit: limitNum,
    count: data.length,
  };
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
