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
      AND b.booking_status_id = 1 AND trash = false
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
    WHERE DATE(b.pickup_date) > CURRENT_DATE AND trash = false
    ORDER BY b.pickup_date ASC
  `;
  return (await pool.query(sql)).rows;
};

// RECENT BOOKINGS (NOT COMPLETED)
const getRecentBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_status_id != 11 AND b.booking_status_id != 1 AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// COMPLETED BOOKINGS
const getCompletedBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_status_id = 11 AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// WEB BOOKINGS
const getWebBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'web' AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// APP BOOKINGS
const getAppBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'app' AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// IVR BOOKINGS
const getIvrBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'ivr' AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// QUOTED BOOKINGS
const getQuotedBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.quoted = true AND trash = false
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
  orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`, // default
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
  ${whereClause} AND trash = false
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
  const query = `
    SELECT 
      b.*,
      vt.name as vehicle_type_name,
      d.name as driver_name,
      v.color,
      v.make,
      v.model,
      v.vehicle_number
    FROM bookings b
    LEFT JOIN vehicle_types vt ON b.vehicle_type_id = vt.id
    LEFT JOIN drivers d ON b.driver_id = d.id
    LEFT JOIN vehicles v ON d.vehicle_id = v.id
    WHERE b.id = $1 AND trash = false
  `;

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

const updateBookingonRoute = async (id, on_route, completed, arrived) => {
  const query = `
    UPDATE bookings
    SET on_route = $1, completed = $2, arrived = $3
    WHERE id = $4
  `;
  return pool.query(query, [on_route, completed, arrived, id]);
};

const updateBookingFares = async (
  id,
  fares,
  parking_charges,
  waiting_charges,
  extra_drop_charges,
  total_charges,
) => {
  const query = `
    UPDATE bookings
    SET fares = $1, parking_charges = $2, waiting_charges = $3, extra_drop_charges =$4, total_charges = $5
    WHERE id = $6
  `;
  return pool.query(query, [
    fares,
    parking_charges,
    waiting_charges,
    extra_drop_charges,
    total_charges,
    id,
  ]);
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

const getBookingByDriverCommission = async (
  driver_id,
  payment_type_ids,
  from_date,
  to_date,
) => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.driver_id = $1 
    AND b.payment_type_id = ANY($2::int[])
    AND b.booking_status_id = 11
    AND b.commission_status = 'open'
    AND b.commission = true
    AND b.pickup_date::date BETWEEN $3::date AND $4::date
  `;

  const res = await pool.query(sql, [
    driver_id,
    payment_type_ids,
    from_date,
    to_date,
  ]);

  return res.rows;
};

// Total bookings
const getTotalBookingsByCustomer = async (customerId) => {
  const query = `
    SELECT COUNT(*) 
    FROM bookings 
    WHERE customer_id = $1
  `;
  const { rows } = await pool.query(query, [customerId]);
  return Number(rows[0].count);
};

// Cancelled bookings
const getCancelledBookingsByCustomer = async (customerId) => {
  const query = `
    SELECT COUNT(*) 
    FROM bookings 
    WHERE customer_id = $1 
    AND booking_status_id = 12
  `;
  const { rows } = await pool.query(query, [customerId]);
  return Number(rows[0].count);
};

// Total completed ride amount
const getTotalAmountByCustomer = async (customerId) => {
  const query = `
    SELECT COALESCE(SUM(fares), 0) as total
    FROM bookings
    WHERE customer_id = $1
    AND booking_status_id = 11
  `;
  const { rows } = await pool.query(query, [customerId]);
  return Number(rows[0].total);
};

const getBookingStatusById = async (bookingId) => {
  const query = `
    SELECT booking_status_id 
    FROM bookings
    WHERE id = $1
  `;

  const result = await pool.query(query, [bookingId]);
  return result.rows[0];
};

// GET BOOKINGS BY ID
const getBookingByDriverIdAndStatus = async (driver_id, booking_status_id) => {
  const whereClause = `
    WHERE b.driver_id = $1 
    AND b.booking_status_id = $2
  `;

  const values = [driver_id, booking_status_id];

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

const hasActiveBookingToday = async (driverId) => {
  const query = `
    SELECT id
    FROM bookings
    WHERE driver_id = $1
      AND booking_status_id IN (2,3,6,10,14,15)
      AND TO_DATE(pickup_date, 'YYYY-FMMM-FMDD') = CURRENT_DATE
    LIMIT 1;
  `;

  const result = await pool.query(query, [driverId]);

  if (result.rows.length > 0) {
    return {
      has_active: true,
      booking_id: result.rows[0].id,
    };
  }

  return {
    has_active: false,
    booking_id: null,
  };
};

const getDriverCurrentJob = async (driverId) => {
  const query = `
    ${ENRICHED_SELECT}
    WHERE b.driver_id = $1
      AND b.booking_status_id IN (1,2,3,6,10,14,15)
      AND TO_DATE(b.pickup_date, 'YYYY-FMMM-FMDD') = CURRENT_DATE
    ORDER BY b.id DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [driverId]);

  return result.rows[0] || null;
};

const updateBookingFareCharges = async (
  id,
  fares,
  parking_charges,
  waiting_charges,
  extra_drop_charges,
  meet_and_greet,
  congestion_charges,
  total_charges,
) => {
  const query = `
    UPDATE bookings
    SET fares = $1, parking_charges = $2 , waiting_charges = $3 , extra_drop_charges = $4 , meet_and_greet = $5 , congestion_charges = $6 , total_charges= $7
    WHERE id = $8
  `;
  return pool.query(query, [
    fares,
    parking_charges,
    waiting_charges,
    extra_drop_charges,
    meet_and_greet,
    congestion_charges,
    total_charges,
    id,
  ]);
};

const getDriverTotalEarning = async (driver_id) => {
  const query = `
    SELECT 
      COALESCE(SUM(fares), 0) AS total_earning,
      COUNT(id) AS total_bookings
    FROM bookings
    WHERE driver_id = $1
    AND booking_status_id = 11
  `;

  const { rows } = await pool.query(query, [driver_id]);
  return rows[0];
};

const getBookingByDriverRent = async (
  driver_id,
  payment_type_ids,
  from_date,
  to_date,
) => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.driver_id = $1 
    AND b.payment_type_id = ANY($2::int[])
    AND b.booking_status_id = 11
    AND b.commission_status = 'open'
    AND b.commission = true
    AND b.pickup_date::date BETWEEN $3::date AND $4::date
    AND trash = false
  `;

  const res = await pool.query(sql, [
    driver_id,
    payment_type_ids,
    from_date,
    to_date,
  ]);

  return res.rows;
};

const getBookingByCustomerId = async (customer_id) => {
  let whereClause = `WHERE b.customer_id = $1 AND b.booking_status_id = 11 AND trash = false`;
  const values = [customer_id];

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

const getBookingByCustomerMobile = async (mobile, name) => {
  let whereClause = `WHERE (b.mobile = $1 OR b.name = $2) AND trash = false`;
  const values = [mobile, name];

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

const getScheduleBookingByCustomerId = async (customer_id) => {
  let whereClause = `
    WHERE b.customer_id = $1 
    AND b.booking_status_id = 1 
    AND trash = false
    AND (b.pickup_date::date + b.pickup_time::time) > NOW()
  `;

  const values = [customer_id];

  const sql = `
    ${ENRICHED_SELECT}
    ${whereClause}
    ORDER BY 
      b.pickup_date ASC,
      b.pickup_time ASC
  `;

  const res = await pool.query(sql, values);
  return res.rows;
};

const checkDriverFobBooking = async (driver_id) => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.driver_id = $1 
    AND b.fob = true
    AND b.booking_status_id = 15 
    ORDER BY b.dispatched_at ASC
    LIMIT 1
  `;

  const values = [driver_id];

  const res = await pool.query(sql, values);
  return res.rows[0]; // 👈 only one booking
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
  updateBookingonRoute,
  getBookingByDriverCommission,
  getTotalBookingsByCustomer,
  getCancelledBookingsByCustomer,
  getTotalAmountByCustomer,
  getBookingStatusById,
  getBookingByDriverIdAndStatus,
  hasActiveBookingToday,
  getDriverCurrentJob,
  updateBookingFareCharges,
  getDriverTotalEarning,
  getBookingByDriverRent,
  getBookingByCustomerId,
  getBookingByCustomerMobile,
  getScheduleBookingByCustomerId,
  checkDriverFobBooking,
};
