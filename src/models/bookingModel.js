const pool = require("../db");

const insertBookingRow = async (client, bookingRow) => {
  const cols = Object.keys(bookingRow);
  const vals = Object.values(bookingRow);
  const params = vals.map((_, i) => `$${i + 1}`).join(",");
  const sql = `INSERT INTO bookings (${cols.join(",")})
               VALUES (${params})
               RETURNING *;`;
  const res = await client.query(sql, vals);
  return res.rows[0];
};

const updateBooking = async (id, updates) => {
  const cols = Object.keys(updates);
  const vals = Object.values(updates);

  if (!cols.length) return null;

  const set = cols.map((c, i) => `${c} = $${i + 2}`).join(", ");

  const sql = `
    UPDATE bookings
    SET ${set}, updated_at = now()
    WHERE id = $1
    RETURNING *
  `;

  const res = await pool.query(sql, [id, ...vals]);
  return res.rows[0];
};

const ENRICHED_SELECT = `
SELECT 
  b.*,

  json_build_object(
    'booking_status', bs.booking_status
  ) AS booking_status,

  json_build_object(
    'booking_type', bt.booking_type
  ) AS booking_type,

  json_build_object(
    'journey_type', jt.journey_type
  ) AS journey_type,

  json_build_object(
    'id', s.id,
    'name', s.name,
    'telephone_number', s.telephone_number
  ) AS subsidiary,

  json_build_object(
    'name', vt.name,
    'background_color', vt.background_color,
    'foreground_color', vt.foreground_color
  ) AS vehicle_type,

  json_build_object(
    'id', pt.id,
    'name', pt.name,
    'background_color', pt.background_color,
    'foreground_color', pt.foreground_color
  ) AS payment_type,

  json_build_object(
    'id', a.id,
    'name', a.name,
    'background_color', a.background_color,
    'foreground_color', a.foreground_color,
    'has_vat', a.has_vat,
    'bank_information', a.bank_information,
    'fare_controller', a.fare_controller,
    'account_fees_type', a.account_fees_type,
    'account_fees', a.account_fees,
    'account_fees_vat', a.account_fees_vat
  ) AS account,

  json_build_object(
    'id', d.id,
    'username', d.username,
    'name', d.name,
    'mobile_device_id', d.mobile_device_id,
    'phc_vehicle_number', d.phc_vehicle_number,
    'phc_driver_number', d.phc_driver_number,
    'vehicle_id', d.vehicle_id,
    'driver_commission', d.driver_commission,
    'session_status', d.session_status,
    'vehicle', json_build_object(
        'make', v.make,
        'model', v.model,
        'color', v.color,
        'vehicle_number', v.vehicle_number
    )
  ) AS driver,

  json_build_object(
    'door_number', c.door_number,
    'address1', c.address1,
    'address2', c.address2,
    'blacklist', c.blacklist
  ) AS customer,

  json_build_object(
    'username', e.username,
    'role_id', e.role_id
  ) AS employee,

  json_build_object(
  'pickup',
  CASE
    WHEN lp.id IS NOT NULL THEN json_build_object(
      'id', lp.id,
      'name', lp.name,
      'location_type', json_build_object(
            'id', ltp.id,
            'name', ltp.name,
            'background_color', ltp.background_color,
            'foreground_color', ltp.foreground_color
          )
    )
    ELSE 
    json_build_object(
      'id', null,
      'name', null,
      'location_type', json_build_object(
        'id', null,
        'name', null,
        'background_color', null,
        'foreground_color', null
      )
    )
  END,
  'dropoff',
  CASE
    WHEN ld.id IS NOT NULL THEN json_build_object(
      'id', ld.id,
      'name', ld.name,
      'location_type', json_build_object(
            'id', ltp.id,
            'name', ltp.name,
            'background_color', ltp.background_color,
            'foreground_color', ltp.foreground_color
          )

    )
    ELSE 
    json_build_object(
      'id', null,
      'name', null,
      'location_type', json_build_object(
  'id', null,
  'name', null,
  'background_color', null,
  'foreground_color', null
)

    )
  END
) AS airport


FROM bookings b
LEFT JOIN booking_statuses bs ON b.booking_status_id = bs.id
LEFT JOIN booking_types bt ON b.booking_type_id = bt.id
LEFT JOIN journey_types jt ON b.journey_type_id = jt.id
LEFT JOIN subsidiaries s ON b.subsidiary_id = s.id
LEFT JOIN vehicle_types vt ON b.vehicle_type_id = vt.id
LEFT JOIN payment_types pt ON b.payment_type_id = pt.id
LEFT JOIN accounts a ON b.account_id = a.id
LEFT JOIN drivers d ON b.driver_id = d.id
LEFT JOIN vehicles v ON d.vehicle_id = v.id
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN employees e ON b.employee_id = e.id
LEFT JOIN locations lp
  ON lp.location_type_id = 2
 AND b.pickup ILIKE '%' || lp.name || '%'

LEFT JOIN locations ld
  ON ld.location_type_id = 2
 AND b.dropoff ILIKE '%' || ld.name || '%'
LEFT JOIN location_types ltp ON lp.location_type_id = ltp.id
LEFT JOIN location_types ltd ON ld.location_type_id = ltd.id


`;

// TODAY BOOKINGS (STATUS = WAITING)
const getTodayBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE 
      DATE(b.pickup_date) = CURRENT_DATE
      AND b.booking_status_id = 1
    ORDER BY 
      TRIM(b.pickup_time)::time ASC
  `;
  return (await pool.query(sql)).rows;
};

// ALL BOOKINGS
const getAllBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// PRE BOOKINGS (DATE > TODAY)
const getPreBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE DATE(b.pickup_date) > CURRENT_DATE
    ORDER BY b.pickup_date ASC
  `;
  return (await pool.query(sql)).rows;
};

// RECENT BOOKINGS (NOT COMPLETED)
const getRecentBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_status_id != 11 AND b.booking_status_id != 1
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// COMPLETED BOOKINGS
const getCompletedBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_status_id = 11
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// WEB BOOKINGS
const getWebBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'web'
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// APP BOOKINGS
const getAppBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'app'
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// IVR BOOKINGS
const getIvrBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'ivr'
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// QUOTED BOOKINGS
const getQuotedBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.quoted = true
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// GET BOOKINGS BY TABS (PAGINATION + SEARCHING)
const getBookingsByTab = async ({
  tabWhere,
  offset = 0,
  limit = 20,
  filters = {},
  orderBy = "b.id ASC", // default
}) => {
  const conditions = [];
  const params = [];
  let idx = 1;

  // 🔍 SEARCH FIELDS
  if (filters.reference_number) {
    conditions.push(`b.reference_number ILIKE $${idx++}`);
    params.push(`%${filters.reference_number}%`);
  }

  if (filters.pickup_date) {
    conditions.push(`CAST(b.pickup_date AS TEXT) ILIKE $${idx++}`);
    params.push(`%${filters.pickup_date}%`);
  }

  if (filters.pickup_time) {
    conditions.push(`CAST(b.pickup_time AS TEXT) ILIKE $${idx++}`);
    params.push(`%${filters.pickup_time}%`);
  }

  if (filters.name) {
    conditions.push(`b.name ILIKE $${idx++}`);
    params.push(`%${filters.name}%`);
  }

  if (filters.pickup) {
    conditions.push(`b.pickup ILIKE $${idx++}`);
    params.push(`%${filters.pickup}%`);
  }

  if (filters.dropoff) {
    conditions.push(`b.dropoff ILIKE $${idx++}`);
    params.push(`%${filters.dropoff}%`);
  }

  if (filters.account_name) {
    conditions.push(`a.name ILIKE $${idx++}`);
    params.push(`%${filters.account_name}%`);
  }

  if (filters.driver_name) {
    conditions.push(`d.name ILIKE $${idx++}`);
    params.push(`%${filters.driver_name}%`);
  }

  if (filters.vehicle_type_name) {
    conditions.push(`vt.name ILIKE $${idx++}`);
    params.push(`%${filters.vehicle_type_name}%`);
  }

  if (filters.notes) {
    conditions.push(`b.notes::text ILIKE $${idx++}`);
    params.push(`%${filters.notes}%`);
  }

  if (filters.fares) {
    conditions.push(`CAST(b.fares AS TEXT) ILIKE $${idx++}`);
    params.push(`%${filters.fares}%`);
  }

  if (filters.booking_status) {
    conditions.push(`bs.booking_status ILIKE $${idx++}`);
    params.push(`%${filters.booking_status}%`);
  }

  if (filters.journey_type) {
    conditions.push(`jt.journey_type ILIKE $${idx++}`);
    params.push(`%${filters.journey_type}%`);
  }

  if (filters.payment_type) {
    conditions.push(`pt.name ILIKE $${idx++}`);
    params.push(`%${filters.payment_type}%`);
  }

  const whereClause = `
    WHERE ${tabWhere}
    ${conditions.length ? "AND " + conditions.join(" AND ") : ""}
  `;

  // 🔢 COUNT QUERY
  const countSql = `
    SELECT COUNT(*) AS total
    FROM bookings b
    LEFT JOIN booking_statuses bs ON b.booking_status_id = bs.id
    LEFT JOIN journey_types jt ON b.journey_type_id = jt.id
    LEFT JOIN payment_types pt ON b.payment_type_id = pt.id
    LEFT JOIN accounts a ON b.account_id = a.id
    LEFT JOIN drivers d ON b.driver_id = d.id
    LEFT JOIN vehicle_types vt ON b.vehicle_type_id = vt.id
    ${whereClause}
  `;

  const countResult = await pool.query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // 📦 DATA QUERY
  const dataSql = `
  ${ENRICHED_SELECT}
  ${whereClause}
  ORDER BY ${orderBy}
  OFFSET $${idx++} LIMIT $${idx++}
`;

  params.push(offset, limit);

  const result = await pool.query(dataSql, params);

  return { rows: result.rows, total };
};

// GET BOOKINGS BY ID
const getBookingByIdEnriched = async (id) => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.id = $1
  `;
  const res = await pool.query(sql, [id]);
  return res.rows[0];
};

// CHECKING ID IS PRESENT OR NOT (FOR UPDATE STATUS AND FARES)
const findBookingById = async (id) => {
  const query = `SELECT id FROM bookings WHERE id = $1`;
  return pool.query(query, [id]);
};

// FIND ALL DATA OF BOOKING BY ID (FOR UPDATE)
const findBookingsById = async (id) => {
  const res = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [id]);
  return res.rows[0];
};

const trashBooking = async (id) => {
  const query = `
    UPDATE bookings
    SET trash = true
    WHERE id = $1
  `;
  return pool.query(query, [id]);
};

const findExistingBookings = async (ids) => {
  const query = `
    SELECT id FROM bookings
    WHERE id = ANY($1::int[])
  `;
  return pool.query(query, [ids]);
};

const trashMultipleBookings = async (ids) => {
  const query = `
    UPDATE bookings
    SET trash = true
    WHERE id = ANY($1::int[])
  `;
  return pool.query(query, [ids]);
};

const updateBookingStatus = async (id, statusId) => {
  const query = `
    UPDATE bookings
    SET booking_status_id = $1
    WHERE id = $2
  `;
  return pool.query(query, [statusId, id]);
};

const updateBookingonRoute = async (id, on_route) => {
  const query = `
    UPDATE bookings
    SET on_route = $1
    WHERE id = $2
  `;
  return pool.query(query, [on_route, id]);
};

const updateBookingFares = async (id, fares) => {
  const query = `
    UPDATE bookings
    SET fares = $1
    WHERE id = $2
  `;
  return pool.query(query, [fares, id]);
};

// GET BOOKINGS BY ID
const getBookingByDriverId = async (driver_id, lastdays) => {
  let whereClause = `WHERE b.driver_id = $1 AND b.booking_status_id = 11`;
  const values = [driver_id];

  if (lastdays) {
  whereClause += `
    AND b.pickup_date::date >= CURRENT_DATE - INTERVAL '${lastdays} days'
  `;
}


  const sql = `
    ${ENRICHED_SELECT}
    ${whereClause}
    ORDER BY 
      b.pickup_date DESC,
      b.pickup_time DESC
  `;

  const res = await pool.query(sql, values);
  return res.rows;
};


module.exports = {
  pool,
  insertBookingRow,
  updateBooking,
  getTodayBookings,
  getPreBookings,
  getAllBookings,
  getAppBookings,
  getCompletedBookings,
  getIvrBookings,
  getRecentBookings,
  getQuotedBookings,
  getWebBookings,
  getBookingsByTab,
  getBookingByIdEnriched,
  findBookingById,
  findBookingsById,
  trashBooking,
  findExistingBookings,
  trashMultipleBookings,
  updateBookingStatus,
  updateBookingFares,
  getBookingByDriverId,
  updateBookingonRoute
};
