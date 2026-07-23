const pool = require("../db");

// ---------------------------------------------------------
// CREATE BOOKING MODEL
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// UPDATE BOOKING BY ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// BOOKING RESPONSE JSON
// ---------------------------------------------------------
const ENRICHED_SELECT = `
  SELECT 
    b.id,
    b.reference_number,
    b.subsidiary_id,
    b.booking_type_id,
    b.booking_status_id,
    b.journey_type_id,
    b.account_id,
    b.customer_id,
    b.employee_id,
    b.pickup,
    b.dropoff,
    b.pickup_date,
    b.pickup_time,
    b.dropoff_date,
    b.dropoff_time,
    b.pickup_door_number,
    b.dropoff_door_number,
    b.pickup_plot,
    b.dropoff_plot,
    b.pickup_location_type_id,
    b.dropoff_location_type_id,
    b.pickup_latitude,
    b.pickup_longitude,
    b.dropoff_latitude,
    b.dropoff_longitude,
    b.viapoints,
    b.restricted_drivers,
    b.flight_number,
    b.arriving_from,
    b.vehicle_type_id,
    b.vehicle_id,
    b.driver_id,
    b.passengers,
    b.luggages,
    b.hand_luggages,
    b.child_seat,
    b.name,
    b.email,
    b.mobile,
    b.telephone,
    b.lead_time,
    b.notes,
    b.special_instructions,
    b.payment_type_id,
    b.company_price,
    b.fares,
    b.total_charges,
    b.parking_charges,
    b.waiting_charges,
    b.extra_drop_charges,
    b.credit_card_charges,
    b.congestion_charges,
    b.miles,
    b.meet_and_greet,
    b.department,
    b.escort_id,
    b.order_number,
    b.booked_by,
    b.add_return_fare,
    b.fare_meter_status,
    b.fare_meter,
    b.quotation,
    b.quoted,
    b.dispatch,
    b.dispatch_as,
    b.sms,
    b.emailflag,
    b.trash,
    b.hidden,
    b.multi_booking_id,
    b.associated_booking,
    b.invoice_status,
    b.commission_status,
    b.commission,
    b.skipped_bookings,
    b.permanent,
    b.toggle_driver_text,
    b.toggle_passenger_text,
    b.cancelled_reason,
    b.booking_source,
    b.on_route,
    b.arrived,
    b.passenger_on_board,
    b.completed,
    b.controller_completed,
    b.driver_waiting_time,
    b.dispatched_at,
    b.booked_at,
    b.stripe_customer_id,
    b.stripe_payment_id,
    b.invoice_number,
    b.initial_subsidiary_id,
    b.created_at,
    b.updated_at,
    b.eta,
    b.fob,
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

// ---------------------------------------------------------
// GET TODAY BOOKINGS (STATUS = WAITING)
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET ALL BOOKINGS
// ---------------------------------------------------------
const getAllBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// ---------------------------------------------------------
// GET PRE BOOKINGS (DATE > TODAY)
// ---------------------------------------------------------
const getPreBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE DATE(b.pickup_date) > CURRENT_DATE AND trash = false
    ORDER BY b.pickup_date ASC
  `;
  return (await pool.query(sql)).rows;
};

// ---------------------------------------------------------
// GET RECENT BOOKINGS (NOT COMPLETED)
// ---------------------------------------------------------
const getRecentBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_status_id != 11 AND b.booking_status_id != 1 AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// ---------------------------------------------------------
// GET COMPLETED BOOKINGS
// ---------------------------------------------------------
const getCompletedBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_status_id = 11 AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// ---------------------------------------------------------
// GET WEB BOOKINGS
// ---------------------------------------------------------
const getWebBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'web' AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// ---------------------------------------------------------
// GET APP BOOKINGS
// ---------------------------------------------------------
const getAppBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'app' AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// ---------------------------------------------------------
// GET IVR BOOKINGS
// ---------------------------------------------------------
const getIvrBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.booking_source = 'ivr' AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// ---------------------------------------------------------
// GET QUOTED BOOKINGS
// ---------------------------------------------------------
const getQuotedBookings = async () => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.quoted = true AND trash = false
    ORDER BY b.id DESC
  `;
  return (await pool.query(sql)).rows;
};

// ---------------------------------------------------------
// GET BOOKINGS BY TABS (PAGINATION + SEARCHING)
// ---------------------------------------------------------
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

  if (filters.company_id) {
    conditions.push(`b.company_id = $${idx++}`);
    params.push(filters.company_id);
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

// ---------------------------------------------------------
// GET BOOKINGS BY ID
// ---------------------------------------------------------
const getBookingByIdEnriched = async (id) => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.id = $1
  `;
  const res = await pool.query(sql, [id]);
  return res.rows[0];
};

// ---------------------------------------------------------
// CHECKING ID IS PRESENT OR NOT (FOR UPDATE STATUS AND FARES)
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// FIND ALL DATA OF BOOKING BY ID (FOR UPDATE)
// ---------------------------------------------------------
const findBookingsById = async (id) => {
  const res = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [id]);
  return res.rows[0];
};

// ---------------------------------------------------------
// CREATE TRASH BOOKING
// ---------------------------------------------------------
const trashBooking = async (id) => {
  const query = `
    UPDATE bookings
    SET trash = true
    WHERE id = $1
  `;
  return pool.query(query, [id]);
};

// ---------------------------------------------------------
// FIND EXISTING BOOKING
// ---------------------------------------------------------
const findExistingBookings = async (ids) => {
  const query = `
    SELECT id FROM bookings
    WHERE id = ANY($1::int[])
  `;
  return pool.query(query, [ids]);
};

// ---------------------------------------------------------
// CREATE MULTIPLE TRASH BOOKING
// ---------------------------------------------------------
const trashMultipleBookings = async (ids) => {
  const query = `
    UPDATE bookings
    SET trash = true
    WHERE id = ANY($1::int[])
  `;
  return pool.query(query, [ids]);
};

// ---------------------------------------------------------
// UPDATE BOOKING STATUS
// ---------------------------------------------------------
const updateBookingStatus = async (id, statusId) => {
  const query = `
    UPDATE bookings
    SET booking_status_id = $1
    WHERE id = $2
  `;
  return pool.query(query, [statusId, id]);
};

// ---------------------------------------------------------
// UPDATE BOOKING ON ROUTE STATUS
// ---------------------------------------------------------
const updateBookingonRoute = async (id, on_route, completed, arrived) => {
  const query = `
    UPDATE bookings
    SET on_route = $1, completed = $2, arrived = $3
    WHERE id = $4
  `;
  return pool.query(query, [on_route, completed, arrived, id]);
};

// ---------------------------------------------------------
// UPDATE BOOKING FARES
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKINGS BY DRIVER ID
// ---------------------------------------------------------
const getBookingByDriverId = async (driver_id, lastdays) => {
  let whereClause = `
    WHERE b.driver_id = $1
      AND b.booking_status_id = 11
      AND b.trash = false
  `;

  const values = [driver_id];

  if (lastdays) {
    whereClause += `
      AND b.pickup_date::date >= CURRENT_DATE - ($2 * INTERVAL '1 day')
    `;
    values.push(lastdays);
  }

  const sql = `
    ${ENRICHED_SELECT}
    ${whereClause}
    ORDER BY
      b.pickup_date::date DESC,
      COALESCE(NULLIF(b.pickup_time, ''), '00:00:00')::time DESC,
      b.id DESC
  `;

  const res = await pool.query(sql, values);
  return res.rows;
};

// ---------------------------------------------------------
// GET BOOKING BY DRIVER COMMISSION
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET TOTAL BOOKING BY CUSTOMER ID
// ---------------------------------------------------------
const getTotalBookingsByCustomer = async (customerId) => {
  const query = `
    SELECT COUNT(*) 
    FROM bookings 
    WHERE customer_id = $1
  `;
  const { rows } = await pool.query(query, [customerId]);
  return Number(rows[0].count);
};

// ---------------------------------------------------------
// GET CANCELLED BOOKING BY CUSTOMER ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET TOTAL AMOUNT BY CUSTOMER ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKING STATUS BY ID
// ---------------------------------------------------------
const getBookingStatusById = async (bookingId) => {
  const query = `
    SELECT booking_status_id 
    FROM bookings
    WHERE id = $1
  `;

  const result = await pool.query(query, [bookingId]);
  return result.rows[0];
};

// ---------------------------------------------------------
// GET BOOKINGS BY DRIVER ID AND STATUS
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// CHECK ACTIVE BOOKING TODAY
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET DRIVER CURRENT BOOKING
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// UPDATE BOOKING FARE CHARGES
// ---------------------------------------------------------
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
    SET 
      fares = $1, 
      parking_charges = $2 , 
      waiting_charges = $3 , 
      extra_drop_charges = $4 , 
      meet_and_greet = $5 , 
      congestion_charges = $6 , 
      total_charges= $7
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

// ---------------------------------------------------------
// GET DRIVER TOTAL EARNING
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKING BY DRIVER RENT
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKING BY CUSTOMER ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKING CUSTOMER MOBILE
// ---------------------------------------------------------
const getBookingByCustomerMobile = async (mobile, name, company_id) => {
  let whereClause = `WHERE (b.mobile = $1 OR b.name = $2) AND b.company_id = $3 AND trash = false`;
  const values = [mobile, name, company_id];

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

// ---------------------------------------------------------
// GET SCHEDULE BOOKING BY CUSTOMER ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// CHECK DRIVER FOLLOW ON BOOKING
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET FOLLOW ON BOOKING HISTORY BY DRIVER ID
// ---------------------------------------------------------
const getFOBBookingHIstoryByDriverId = async (driver_id) => {
  const whereClause = `
    WHERE b.driver_id = $1 
    AND b.fob = true
  `;

  const values = [driver_id];

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

// ---------------------------------------------------------
// COMPLETE BOOKING BY CONTROLLER
// ---------------------------------------------------------
const completeBoookingByController = async (id, driver_id) => {
  const query = `
    UPDATE bookings
    SET booking_status_id = 11, completed = true , controller_completed = true , driver_id = $1
    WHERE id = $2
  `;
  return pool.query(query, [driver_id, id]);
};

// ---------------------------------------------------------
// UPDATE DASHBOARD BOOKING FARES
// ---------------------------------------------------------
const updateDashboardBookingFares = async (id, total_charges) => {
  const query = `
    UPDATE bookings
    SET fares= $1
    WHERE id = $2
  `;
  return pool.query(query, [total_charges, id]);
};

// ---------------------------------------------------------
// RECOVER DASHBOARD BOOKING
// ---------------------------------------------------------
const recoverDashboardBooking = async (id) => {
  const query = `
    UPDATE bookings
    SET booking_status_id = 1,
        driver_id = NULL
    WHERE id = $1
  `;
  return pool.query(query, [id]);
};

// ---------------------------------------------------------
// GET COMPLETE BOOKING LOGS BY DRIVER ID
// ---------------------------------------------------------
const getCompletedBookingLogsByDriverId = async (driver_id, filters = {}) => {
  const {
    from_date,
    to_date,
    from_time,
    to_time,

    ref,
    vehicle,
    pickup,
    dropoff,
    fares,
    datetime,
  } = filters;

  let whereClause = `
    WHERE b.driver_id = $1
    AND b.booking_status_id = 11
  `;

  const values = [driver_id];
  let index = 2;

  // DATE RANGE FILTER
  if (from_date && to_date) {
    whereClause += `
    AND b.pickup_date::DATE
    BETWEEN $${index}::DATE AND $${index + 1}::DATE
  `;

    values.push(from_date, to_date);
    index += 2;
  }

  // TIME RANGE FILTER
  if (from_time && to_time) {
    whereClause += `
      AND b.pickup_time BETWEEN $${index} AND $${index + 1}
    `;

    values.push(from_time, to_time);
    index += 2;
  }

  // REF SEARCH
  if (ref) {
    whereClause += `
      AND b.reference_number ILIKE $${index}
    `;

    values.push(`%${ref}%`);
    index++;
  }

  // VEHICLE SEARCH
  if (vehicle) {
    whereClause += `
      AND vt.name ILIKE $${index}
    `;

    values.push(`%${vehicle}%`);
    index++;
  }

  // PICKUP SEARCH
  if (pickup) {
    whereClause += `
      AND b.pickup ILIKE $${index}
    `;

    values.push(`%${pickup}%`);
    index++;
  }

  // DROPOFF SEARCH
  if (dropoff) {
    whereClause += `
      AND b.dropoff ILIKE $${index}
    `;

    values.push(`%${dropoff}%`);
    index++;
  }

  // FARES SEARCH
  if (fares) {
    whereClause += `
      AND CAST(b.fares AS TEXT) ILIKE $${index}
    `;

    values.push(`%${fares}%`);
    index++;
  }

  // DATETIME SEARCH
  if (datetime) {
    whereClause += `
      AND (
        TO_CHAR(b.pickup_date::DATE, 'YYYY-MM-DD') || ' ' ||
        TO_CHAR(b.pickup_time::TIME, 'HH24:MI')
      ) ILIKE $${index}
    `;

    values.push(`%${datetime}%`);
    index++;
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

// ---------------------------------------------------------
// GET DRIVER BOOKING AND EARNING STATISTICS
// ---------------------------------------------------------
const getDriverEarningsStatistics = async ({
  view,
  date,
  from_date,
  to_date,
  driver_id,
}) => {
  const values = [];
  let index = 1;

  let whereClause = `
    WHERE b.trash = false
    AND b.booking_status_id = 11
  `;

  if (driver_id) {
    whereClause += ` AND b.driver_id = $${index}`;
    values.push(driver_id);
    index++;
  }

  // DATE FILTERS

  if (view === "daily") {
    whereClause += `
      AND b.pickup_date::date = $${index}::date
    `;

    values.push(date);
    index++;
  } else if (view === "weekly") {
    whereClause += `
      AND DATE_TRUNC('week', b.pickup_date::date)
      =
      DATE_TRUNC('week', $${index}::date)
    `;

    values.push(date);
    index++;
  } else if (view === "monthly") {
    whereClause += `
      AND DATE_TRUNC('month', b.pickup_date::date)
      =
      DATE_TRUNC('month', $${index}::date)
    `;

    values.push(date);
    index++;
  } else if (view === "custom" && from_date && to_date) {
    whereClause += `
      AND b.pickup_date::date
      BETWEEN $${index}::date
      AND $${index + 1}::date
    `;

    values.push(from_date, to_date);
    index += 2;
  }

  // SUMMARY DATA

  const summarySql = `
    SELECT

      COUNT(*) AS total_trips,

      COALESCE(
        SUM(b.total_charges),
        0
      ) AS total_earnings,

      COALESCE(
        AVG(b.total_charges),
        0
      ) AS average_per_trip,

      COALESCE(
        SUM(
          CASE
            WHEN b.payment_type_id = 1
            THEN b.total_charges
            ELSE 0
          END
        ),
        0
      ) AS cash_collected

    FROM bookings b

    ${whereClause}
  `;

  const summaryResult = await pool.query(summarySql, values);

  // CHART DATA

  let groupByQuery = "";

  if (view === "daily") {
    groupByQuery = `
      TO_CHAR(
        b.pickup_time::time,
        'HH24'
      )
    `;
  } else if (view === "weekly") {
    groupByQuery = `
      TO_CHAR(
        b.pickup_date::date,
        'Dy'
      )
    `;
  } else if (view === "monthly") {
    groupByQuery = `
      TO_CHAR(
        b.pickup_date::date,
        'DD'
      )
    `;
  } else {
    groupByQuery = `
      TO_CHAR(
        b.pickup_date::date,
        'YYYY-MM-DD'
      )
    `;
  }

  const chartSql = `
    SELECT

      ${groupByQuery}
      AS label,

      COALESCE(
        SUM(b.total_charges),
        0
      ) AS earnings

    FROM bookings b

    ${whereClause}

    GROUP BY label

    ORDER BY label
  `;

  const chartResult = await pool.query(chartSql, values);

  return {
    total_trips: Number(summaryResult.rows[0].total_trips),

    total_earnings: Number(summaryResult.rows[0].total_earnings),

    average_per_trip: Number(summaryResult.rows[0].average_per_trip),

    cash_collected: Number(summaryResult.rows[0].cash_collected),

    chart_data: chartResult.rows,
  };
};

// ---------------------------------------------------------
// GET BOOKING STATISTICS DATA
// ---------------------------------------------------------
const getBookingStatisticsData = async ({
  page = 1,
  limit = 20,
  filters = {},
}) => {
  const offset = (page - 1) * limit;

  const conditions = ["b.trash = false"];
  const params = [];
  let idx = 1;

  // =========================
  // DATE RANGE
  // =========================

  if (filters.from_date) {
    conditions.push(`
    TO_DATE(b.pickup_date, 'YYYY-FMMM-FMDD')
    >= TO_DATE($${idx++}, 'YYYY-MM-DD')
  `);
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    conditions.push(`
    TO_DATE(b.pickup_date, 'YYYY-FMMM-FMDD')
    <= TO_DATE($${idx++}, 'YYYY-MM-DD')
  `);
    params.push(filters.to_date);
  }

  // =========================
  // TIME RANGE
  // =========================

  if (filters.from_time) {
    conditions.push(`TRIM(b.pickup_time)::time >= $${idx++}::time`);
    params.push(filters.from_time);
  }

  if (filters.to_time) {
    conditions.push(`TRIM(b.pickup_time)::time <= $${idx++}::time`);
    params.push(filters.to_time);
  }

  // =========================
  // STATUS
  // =========================

  if (filters.booking_status_id) {
    const statuses = String(filters.booking_status_id)
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id));

    if (statuses.length === 1) {
      conditions.push(`b.booking_status_id = $${idx++}`);
      params.push(statuses[0]);
    } else if (statuses.length > 1) {
      conditions.push(`b.booking_status_id = ANY($${idx++}::int[])`);
      params.push(statuses);
    }
  }

  // =========================
  // PAYMENT TYPE
  // =========================

  if (filters.payment_type_id) {
    const paymentTypes = String(filters.payment_type_id)
      .split(",")
      .map((id) => Number(id.trim()))
      .filter((id) => !isNaN(id));

    if (paymentTypes.length === 1) {
      conditions.push(`b.payment_type_id = $${idx++}`);
      params.push(paymentTypes[0]);
    } else if (paymentTypes.length > 1) {
      conditions.push(`b.payment_type_id = ANY($${idx++}::int[])`);
      params.push(paymentTypes);
    }
  }

  // =========================
  // CUSTOMER
  // =========================

  if (filters.customer) {
    conditions.push(`b.name ILIKE $${idx++}`);
    params.push(`%${filters.customer}%`);
  }

  if (filters.mobile) {
    conditions.push(`b.mobile ILIKE $${idx++}`);
    params.push(`%${filters.mobile}%`);
  }

  if (filters.telephone) {
    conditions.push(`b.telephone ILIKE $${idx++}`);
    params.push(`%${filters.telephone}%`);
  }

  // =========================
  // ACCOUNT
  // =========================

  if (filters.account_id) {
    conditions.push(`b.account_id = $${idx++}`);
    params.push(filters.account_id);
  }

  // =========================
  // DEPARTMENT
  // =========================

  if (filters.department) {
    conditions.push(`b.department ILIKE $${idx++}`);
    params.push(`%${filters.department}%`);
  }

  // =========================
  // ORDER NUMBER
  // =========================

  if (filters.order_number) {
    conditions.push(`b.order_number ILIKE $${idx++}`);
    params.push(`%${filters.order_number}%`);
  }

  // =========================
  // BOOKED BY
  // =========================

  if (filters.booked_by) {
    conditions.push(`b.booked_by ILIKE $${idx++}`);
    params.push(`%${filters.booked_by}%`);
  }

  // =========================
  // EMPLOYEE
  // =========================

  if (filters.employee_id) {
    conditions.push(`b.employee_id = $${idx++}`);
    params.push(filters.employee_id);
  }

  // =========================
  // SUBSIDIARY
  // =========================

  if (filters.subsidiary_id) {
    conditions.push(`b.subsidiary_id = $${idx++}`);
    params.push(filters.subsidiary_id);
  }

  // =========================
  // REFERENCE NUMBER
  // =========================

  if (filters.reference_number) {
    conditions.push(`b.reference_number ILIKE $${idx++}`);
    params.push(`%${filters.reference_number}%`);
  }

  // =========================
  // PICKUP
  // =========================

  if (filters.pickup) {
    conditions.push(`b.pickup ILIKE $${idx++}`);
    params.push(`%${filters.pickup}%`);
  }

  // =========================
  // DROPOFF
  // =========================

  if (filters.dropoff) {
    conditions.push(`b.dropoff ILIKE $${idx++}`);
    params.push(`%${filters.dropoff}%`);
  }

  // =========================
  // DRIVER
  // =========================
  if (filters.driver_id) {
    conditions.push(`b.driver_id = $${idx++}`);
    params.push(Number(filters.driver_id));
  }

  const whereClause = `
    WHERE ${conditions.join(" AND ")}
  `;

  // =========================
  // TOTAL COUNT
  // =========================

  const countSql = `
    SELECT COUNT(*) AS total
    FROM bookings b
    ${whereClause}
  `;

  const countResult = await pool.query(countSql, params);
  const total = parseInt(countResult.rows[0].total);

  // =========================
  // DASHBOARD TOTALS
  // =========================

  const totalsSql = `
    SELECT
      COUNT(*) AS total_bookings,

      COALESCE(SUM(b.fares), 0) AS total_earnings,

      COALESCE(
        SUM(
          CASE
            WHEN b.account_id IS NOT NULL
            THEN b.fares
            ELSE 0
          END
        ),
        0
      ) AS total_account_earnings

    FROM bookings b
    ${whereClause}
  `;

  const totalsResult = await pool.query(totalsSql, params);

  // =========================
  // SORTING
  // =========================

  const sortDirection =
    filters.sort_order?.toUpperCase() === "DESC" ? "DESC" : "ASC";

  let orderColumn;

  switch (filters.sort_by) {
    case "reference_number":
      orderColumn = "b.reference_number";
      break;

    case "datetime":
      orderColumn = `(
    TO_DATE(b.pickup_date,'YYYY-FMMM-FMDD')
    +
    TRIM(b.pickup_time)::time
)`;
      break;

    case "customer":
      orderColumn = "b.name";
      break;

    case "mobile":
      orderColumn = "b.mobile";
      break;

    case "telephone":
      orderColumn = "b.telephone";
      break;

    case "pickup":
      orderColumn = "b.pickup";
      break;

    case "dropoff":
      orderColumn = "b.dropoff";
      break;

    case "fare":
      orderColumn = "b.fares";
      break;

    case "account":
      orderColumn = "a.name";
      break;

    case "order_number":
      orderColumn = "b.order_number";
      break;

    case "payment_type":
      orderColumn = "pt.name";
      break;

    case "driver":
      orderColumn = "d.name";
      break;

    case "vehicle_type":
      orderColumn = "vt.name";
      break;

    case "status":
      orderColumn = "bs.booking_status";
      break;

    default:
      orderColumn = `(
    TO_DATE(b.pickup_date,'YYYY-FMMM-FMDD')
    +
    TRIM(b.pickup_time)::time
)`;
  }

  // =========================
  // DATA QUERY
  // =========================

  const dataSql = `
  ${ENRICHED_SELECT}
  ${whereClause}
  ORDER BY ${orderColumn} ${sortDirection}
  OFFSET $${idx++}
  LIMIT $${idx++}
`;

  const dataParams = [...params, offset, limit];

  const result = await pool.query(dataSql, dataParams);

  return {
    rows: result.rows,
    total,
    totals: {
      total_bookings: Number(totalsResult.rows[0].total_bookings || 0),
      total_earnings: Number(totalsResult.rows[0].total_earnings || 0),
      total_account_earnings: Number(
        totalsResult.rows[0].total_account_earnings || 0,
      ),
    },
  };
};

// ---------------------------------------------------------
// GET BOOKING STATISTICS GRAPH DATA
// ---------------------------------------------------------
const getBookingStatisticsGraphData = async (filters = {}) => {
  const conditions = ["b.trash = false"];
  const params = [];

  let idx = 1;

  // =========================
  // DATE FILTER
  // =========================

  if (filters.from_date) {
    conditions.push(`b.pickup_date >= $${idx++}`);
    params.push(filters.from_date);
  }

  if (filters.to_date) {
    conditions.push(`b.pickup_date <= $${idx++}`);
    params.push(filters.to_date);
  }

  // =========================
  // BOOKING STATUS
  // =========================

  if (filters.booking_status_id) {
    conditions.push(`b.booking_status_id = $${idx++}`);
    params.push(filters.booking_status_id);
  }

  // =========================
  // PAYMENT TYPE
  // =========================

  if (filters.payment_type_id) {
    conditions.push(`b.payment_type_id = $${idx++}`);
    params.push(filters.payment_type_id);
  }

  // =========================
  // SUBSIDIARY
  // =========================

  if (filters.subsidiary_id) {
    conditions.push(`b.subsidiary_id = $${idx++}`);
    params.push(filters.subsidiary_id);
  }

  const whereClause = `
    WHERE ${conditions.join(" AND ")}
  `;

  // =========================
  // GRAPH QUERY
  // =========================

  const sql = `
  SELECT
    TO_CHAR(b.pickup_date::date, 'YYYY-MM-DD') AS date,

    pt.name AS payment_type,

    COUNT(b.id) AS total_bookings,

    COALESCE(SUM(b.fares), 0) AS total_fares

  FROM bookings b

  LEFT JOIN payment_types pt
    ON pt.id = b.payment_type_id

  ${whereClause}

  GROUP BY
    b.pickup_date::date,
    pt.name

  ORDER BY
    b.pickup_date::date ASC
`;

  const result = await pool.query(sql, params);

  // =========================
  // FORMAT RESPONSE
  // =========================

  const formatted = {};

  for (const row of result.rows) {
    const date = row.date;

    if (!formatted[date]) {
      formatted[date] = {
        date,
        payments: [],
      };
    }

    formatted[date].payments.push({
      payment_type: row.payment_type || "Unknown",
      total_bookings: Number(row.total_bookings),
      total_fares: Number(row.total_fares),
    });
  }

  return Object.values(formatted);
};

// ---------------------------------------------------------
// GET INCOME REPORT DATA
// ---------------------------------------------------------
const getIncomeReportData = async ({
  from_date,
  to_date,
  driver_id,
  account_id,
  subsidiary_id,
  payment_type_id,
}) => {
  const conditions = [
    "b.trash = false",
    "b.booking_status_id = 11", // completed only
  ];

  const params = [];

  let idx = 1;

  // =========================
  // DATE FILTER
  // =========================

  if (from_date) {
    conditions.push(
      `TO_DATE(b.pickup_date, 'YYYY-FMMM-FMDD') >= TO_DATE($${idx++}, 'YYYY-MM-DD')`,
    );
    params.push(from_date);
  }

  if (to_date) {
    conditions.push(
      `TO_DATE(b.pickup_date, 'YYYY-FMMM-FMDD') <= TO_DATE($${idx++}, 'YYYY-MM-DD')`,
    );
    params.push(to_date);
  }

  // =========================
  // DRIVER
  // =========================

  if (driver_id) {
    conditions.push(`b.driver_id = $${idx++}`);
    params.push(driver_id);
  }

  // =========================
  // ACCOUNT
  // =========================

  if (account_id) {
    conditions.push(`b.account_id = $${idx++}`);
    params.push(account_id);
  }

  // =========================
  // SUBSIDIARY
  // =========================

  if (subsidiary_id) {
    conditions.push(`b.subsidiary_id = $${idx++}`);
    params.push(subsidiary_id);
  }

  // =========================
  // PAYMENT TYPE
  // =========================

  // ALL => no payment_type_id
  // CASH => 1
  // CARD => 2
  // ACCOUNT => 3

  if (payment_type_id) {
    conditions.push(`b.payment_type_id = $${idx++}`);
    params.push(payment_type_id);
  }

  const whereClause = `
    WHERE ${conditions.join(" AND ")}
  `;

  // =========================
  // TOTALS
  // =========================

  const totalsSql = `
    SELECT
      COUNT(*) AS total_bookings,

      ROUND(
        COALESCE(
          SUM(
            COALESCE(b.fares, 0)
            + COALESCE(b.parking_charges, 0)
            + COALESCE(b.waiting_charges, 0)
            + COALESCE(b.extra_drop_charges, 0)
          ),
          0
        )::numeric,
        2
      ) AS total_earnings

    FROM bookings b
    ${whereClause}
  `;

  const totalsResult = await pool.query(totalsSql, params);

  // =========================
  // DATA
  // =========================

  const sql = `
    SELECT
      b.id,

      UPPER(b.reference_number) AS reference_number,

      b.pickup_date,
      b.pickup_time,

      b.pickup,
      b.dropoff,

      COALESCE(vt.name, '') AS vehicle,

      d.username AS driver_username,
      d.name AS driver_name,

      a.name AS account,

      COALESCE(b.fares, 0) AS fares,

      COALESCE(b.parking_charges, 0) AS parking,

      COALESCE(b.waiting_charges, 0) AS waiting,

      COALESCE(b.extra_drop_charges, 0) AS extra_drop,

      ROUND(
        (
          COALESCE(b.fares, 0)
          + COALESCE(b.parking_charges, 0)
          + COALESCE(b.waiting_charges, 0)
          + COALESCE(b.extra_drop_charges, 0)
        )::numeric,
        2
      ) AS total

    FROM bookings b

    LEFT JOIN drivers d
      ON d.id = b.driver_id

    LEFT JOIN vehicle_types vt
      ON vt.id = b.vehicle_type_id

    LEFT JOIN accounts a
      ON a.id = b.account_id

    ${whereClause}

    ORDER BY
  TO_DATE(b.pickup_date, 'YYYY-FMMM-FMDD') ASC,
  TRIM(b.pickup_time)::time ASC
  `;

  const result = await pool.query(sql, params);

  return {
    rows: result.rows,

    total_bookings: Number(totalsResult.rows[0].total_bookings || 0),

    total_earnings: Number(totalsResult.rows[0].total_earnings || 0),
  };
};

// ---------------------------------------------------------
// GET DRIVER TODAY EARNING
// ---------------------------------------------------------
const getDriverTodayEarning = async (driver_id) => {
  const query = `
    SELECT 
      COALESCE(SUM(fares), 0) AS today_earning,
      COUNT(id) AS total_bookings
    FROM bookings
    WHERE driver_id = $1
      AND booking_status_id = 11
      AND TO_DATE(pickup_date, 'YYYY-MM-DD') = CURRENT_DATE
  `;

  const { rows } = await pool.query(query, [driver_id]);
  return rows[0];
};

// ---------------------------------------------------------
// GET BOOKINGS FOR CUSTOMER INVOICE
// ---------------------------------------------------------
const getBookingsForCustomerInvoice = async (
  customer_id,
  from_date,
  to_date,
  payment_type_ids,
) => {
  const sql = `
    ${ENRICHED_SELECT}

    WHERE b.customer_id = $1
    AND b.pickup_date::date BETWEEN $2 AND $3
    AND b.payment_type_id = ANY($4::int[])
    AND b.booking_status_id = 11

    ORDER BY b.pickup_date ASC
  `;

  const { rows } = await pool.query(sql, [
    customer_id,
    from_date,
    to_date,
    payment_type_ids,
  ]);

  return rows;
};

// ---------------------------------------------------------
// GET BOOKINGS BY REFERENCE NUMBER
// ---------------------------------------------------------
const getBookingByReferenceNumber = async (reference_number) => {
  const sql = `
    ${ENRICHED_SELECT}
    WHERE b.reference_number = $1
  `;
  const res = await pool.query(sql, [reference_number]);
  return res.rows[0];
};

// ---------------------------------------------------------
// GET ALL BOOKINGS WHICH ARE NOT COMPLETED
// ---------------------------------------------------------
const getClearBookings = async ({
  offset = 0,
  limit = 100,
  reference_number,
  pickup_date,
  customer,
  pickup,
  dropoff,
  driver,
  booking_status,
}) => {
  const values = [];
  let index = 1;

  let where = `
    WHERE b.booking_status_id IN (2,3,6,9,10)
    AND b.trash = false
  `;

  if (reference_number) {
    where += ` AND LOWER(b.reference_number) LIKE LOWER($${index})`;
    values.push(`%${reference_number}%`);
    index++;
  }

  if (pickup_date) {
    where += ` AND b.pickup_date = $${index}`;
    values.push(pickup_date);
    index++;
  }

  if (customer) {
    where += ` AND LOWER(b.name) LIKE LOWER($${index})`;
    values.push(`%${customer}%`);
    index++;
  }

  if (pickup) {
    where += ` AND LOWER(b.pickup) LIKE LOWER($${index})`;
    values.push(`%${pickup}%`);
    index++;
  }

  if (dropoff) {
    where += ` AND LOWER(b.dropoff) LIKE LOWER($${index})`;
    values.push(`%${dropoff}%`);
    index++;
  }

  if (driver) {
    where += ` AND LOWER(d.username) LIKE LOWER($${index})`;
    values.push(`%${driver}%`);
    index++;
  }

  if (booking_status) {
    where += ` AND LOWER(bs.booking_status) LIKE LOWER($${index})`;
    values.push(`%${booking_status}%`);
    index++;
  }

  const countSql = `
      SELECT COUNT(*)
      FROM bookings b
      LEFT JOIN drivers d ON d.id = b.driver_id
      LEFT JOIN booking_statuses bs
        ON bs.id = b.booking_status_id
      ${where}
  `;

  const total = (await pool.query(countSql, values)).rows[0].count;

  values.push(offset);
  values.push(limit);

  const sql = `
      ${ENRICHED_SELECT}

      ${where}

      ORDER BY
          b.pickup_date DESC,
          b.pickup_time DESC

      OFFSET $${index}
      LIMIT $${index + 1}
  `;

  const result = await pool.query(sql, values);

  return {
    total: Number(total),
    rows: result.rows,
  };
};

// ---------------------------------------------------------
// CLEAR SELECTED BOOKINGS
// ---------------------------------------------------------
const clearSelectedBookings = async (driver_id, ids) => {
  const sql = `
    UPDATE bookings
    SET
      booking_status_id = 11,
      completed = TRUE,
      controller_completed = TRUE,
      driver_id = $1,
      updated_at = NOW()
    WHERE id = ANY($2::int[])
  `;

  await pool.query(sql, [driver_id, ids]);
};

// ---------------------------------------------------------
// CLEAR ALL SELECTED BOOKINGS
// ---------------------------------------------------------
const clearAllBookings = async () => {
  const sql = `
    UPDATE bookings
    SET
        booking_status_id = 11,
        completed = true,
        controller_completed = true,
        updated_at = NOW()
    WHERE booking_status_id IN (2,3,6,9,10)
    AND trash = false
    `;

  await pool.query(sql);
};

// ---------------------------------------------------------
// GET DRIVERS EARNING BOOKINGS
// ---------------------------------------------------------
const getDriverEarningsBookings = async ({
  driver_id,
  from_date,
  to_date,
  booking_status_id = 11,
  company_id,
}) => {
  const params = [];
  let idx = 1;

  let where = `
    WHERE b.driver_id = $${idx++}
      AND b.booking_status_id = $${idx++}
      AND b.trash = false
  `;

  params.push(driver_id);
  params.push(booking_status_id);

  // Filter by Pickup Date
  if (from_date && to_date) {
    where += `
      AND b.pickup_date::date
      BETWEEN $${idx++}::date AND $${idx++}::date
    `;

    params.push(from_date);
    params.push(to_date);
  }

  // Company Filter
  if (company_id) {
    where += `
      AND b.company_id = $${idx++}
    `;
    params.push(Number(company_id));
  }

  const sql = `
    ${ENRICHED_SELECT}
    ${where}
    ORDER BY
      b.pickup_date::date DESC,
      TRIM(COALESCE(b.pickup_time, '00:00:00'))::time DESC,
      b.id DESC
  `;

  const result = await pool.query(sql, params);

  return result.rows;
};

// ---------------------------------------------------------
// RECOVER DASHBOARD BOOKING
// ---------------------------------------------------------
const noPickupDashboardBooking = async (id) => {
  const query = `
    UPDATE bookings
    SET booking_status_id = 8,
        driver_id = NULL
    WHERE id = $1
  `;
  return pool.query(query, [id]);
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
  getFOBBookingHIstoryByDriverId,
  completeBoookingByController,
  updateDashboardBookingFares,
  recoverDashboardBooking,
  getCompletedBookingLogsByDriverId,
  getDriverEarningsStatistics,
  getBookingStatisticsData,
  getBookingStatisticsGraphData,
  getIncomeReportData,
  getDriverTodayEarning,
  getBookingsForCustomerInvoice,
  getBookingByReferenceNumber,
  getClearBookings,
  clearSelectedBookings,
  clearAllBookings,
  getDriverEarningsBookings,
  noPickupDashboardBooking,
};
