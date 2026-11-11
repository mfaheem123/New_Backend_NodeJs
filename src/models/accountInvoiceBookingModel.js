const pool = require("../db");

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

// ---------------------------------------------------------
// GET BOOKING FOR ACCOUNT INVOICE
// ---------------------------------------------------------
exports.getForAccountInvoice = async (filters) => {
  const {
    subsidiary_id,
    account_id,
    from_date,
    to_date,
    department,
    order_number,
    ref_number,
    datetime,
    pickup,
    dropoff,
    customer,
    vehicle,
    journey_type,
    fare,
    parking_charges,
    waiting_charges,
    extra_drop_charges,
    meet_and_greet,
    congestion_charges,
    total_charges,
  } = filters;

  const conditions = [];
  const values = [];
  let idx = 1;

  conditions.push(`b.subsidiary_id = $${idx++}`);
  values.push(subsidiary_id);

  conditions.push(`b.account_id = $${idx++}`);
  values.push(account_id);

  conditions.push(`b.booking_status_id = 11`);
  conditions.push(`b.invoice_number IS NULL`);

  conditions.push(`b.pickup_date::date BETWEEN $${idx++} AND $${idx++}`);
  values.push(from_date, to_date);

  if (department) {
    conditions.push(`b.department = $${idx++}`);
    values.push(department);
  }

  if (order_number) {
    conditions.push(`b.order_number = $${idx++}`);
    values.push(order_number);
  }

  // 1. Ref #
  if (ref_number) {
    conditions.push(`b.reference_number ILIKE $${idx++}`);
    values.push(`%${ref_number}%`);
  }

  // 2. Pickup Address
  if (pickup) {
    conditions.push(`b.pickup ILIKE $${idx++}`);
    values.push(`%${pickup}%`);
  }

  // 3. Dropoff Address
  if (dropoff) {
    conditions.push(`b.dropoff ILIKE $${idx++}`);
    values.push(`%${dropoff}%`);
  }

  // 4. Customer Name (b.name)
  if (customer) {
    conditions.push(`b.name ILIKE $${idx++}`);
    values.push(`%${customer}%`);
  }

  // 5. Vehicle Type Name (vt.name)
  if (vehicle) {
    conditions.push(`vt.name ILIKE $${idx++}`);
    values.push(`%${vehicle}%`);
  }

  // 6. Journey Type (jt.journey_type)
  if (journey_type) {
    conditions.push(`jt.journey_type ILIKE $${idx++}`);
    values.push(`%${journey_type}%`);
  }

  // 7. DateTime Filter (b.pickup_date + b.pickup_time ki jagah || use karein)
  if (datetime) {
    conditions.push(
      `(b.pickup_date::text || ' ' || b.pickup_time) ILIKE $${idx++}`,
    );
    values.push(`%${datetime}%`);
  }

  // 8. Numeric / Charges Filters (Text casting use ki hai taaki partial amount bhi search ho sake)
  if (fare) {
    conditions.push(`b.fares::text ILIKE $${idx++}`);
    values.push(`%${fare}%`);
  }

  if (parking_charges) {
    conditions.push(`b.parking_charges::text ILIKE $${idx++}`);
    values.push(`%${parking_charges}%`);
  }

  if (waiting_charges) {
    conditions.push(`b.waiting_charges::text ILIKE $${idx++}`);
    values.push(`%${waiting_charges}%`);
  }

  if (extra_drop_charges) {
    conditions.push(`b.extra_drop_charges::text ILIKE $${idx++}`);
    values.push(`%${extra_drop_charges}%`);
  }

  if (meet_and_greet) {
    conditions.push(`b.meet_and_greet::text ILIKE $${idx++}`);
    values.push(`%${meet_and_greet}%`);
  }

  if (congestion_charges) {
    conditions.push(`b.congestion_charges::text ILIKE $${idx++}`);
    values.push(`%${congestion_charges}%`);
  }

  if (total_charges) {
    conditions.push(`b.total_charges::text ILIKE $${idx++}`);
    values.push(`%${total_charges}%`);
  }

  const sql = `
    ${ENRICHED_SELECT}
    WHERE ${conditions.join(" AND ")}
    ORDER BY b.pickup_date ASC, b.pickup_time ASC
  `;

  const res = await pool.query(sql, values);

  return res.rows;
};

// ---------------------------------------------------------
// GET PRE BOOKING FOR ACCOUNT PRE INVOICE
// ---------------------------------------------------------
exports.getPreBookingForAccountPreInvoice = async (filters) => {
  const {
    subsidiary_id,
    account_id,
    from_date,
    to_date,
    department,
    order_number,
    ref_number,
    datetime,
    pickup,
    dropoff,
    customer,
    vehicle,
    journey_type,
    fare,
    parking_charges,
    waiting_charges,
    extra_drop_charges,
    meet_and_greet,
    congestion_charges,
    total_charges,
  } = filters;

  const conditions = [];
  const values = [];
  let idx = 1;

  conditions.push(`b.subsidiary_id = $${idx++}`);
  values.push(subsidiary_id);

  conditions.push(`b.account_id = $${idx++}`);
  values.push(account_id);

  // Fix: 'IS NOT IN' ki jagah 'NOT IN' use hota hai PostgreSQL mein
  conditions.push(`b.booking_status_id NOT IN (11)`);
  conditions.push(`b.invoice_number IS NULL`);

  // Aaj ke baad ki future bookings (Agar aaj ka din bhi include karna ho toh '>=' use karein)
  conditions.push(`b.pickup_date::date > CURRENT_DATE`);

  // From aur To date range ki condition
  conditions.push(`b.pickup_date::date BETWEEN $${idx++} AND $${idx++}`);
  values.push(from_date, to_date);

  if (department) {
    conditions.push(`b.department = $${idx++}`);
    values.push(department);
  }

  if (order_number) {
    conditions.push(`b.order_number = $${idx++}`);
    values.push(order_number);
  }

  // 1. Ref #
  if (ref_number) {
    conditions.push(`b.reference_number ILIKE $${idx++}`);
    values.push(`%${ref_number}%`);
  }

  // 2. Pickup Address
  if (pickup) {
    conditions.push(`b.pickup ILIKE $${idx++}`);
    values.push(`%${pickup}%`);
  }

  // 3. Dropoff Address
  if (dropoff) {
    conditions.push(`b.dropoff ILIKE $${idx++}`);
    values.push(`%${dropoff}%`);
  }

  // 4. Customer Name (b.name)
  if (customer) {
    conditions.push(`b.name ILIKE $${idx++}`);
    values.push(`%${customer}%`);
  }

  // 5. Vehicle Type Name (vt.name)
  if (vehicle) {
    conditions.push(`vt.name ILIKE $${idx++}`);
    values.push(`%${vehicle}%`);
  }

  // 6. Journey Type (jt.journey_type)
  if (journey_type) {
    conditions.push(`jt.journey_type ILIKE $${idx++}`);
    values.push(`%${journey_type}%`);
  }

  // 7. DateTime Filter (b.pickup_date + b.pickup_time ki jagah || use karein)
  if (datetime) {
    conditions.push(
      `(b.pickup_date::text || ' ' || b.pickup_time) ILIKE $${idx++}`,
    );
    values.push(`%${datetime}%`);
  }

  // 8. Numeric / Charges Filters (Text casting use ki hai taaki partial amount bhi search ho sake)
  if (fare) {
    conditions.push(`b.fares::text ILIKE $${idx++}`);
    values.push(`%${fare}%`);
  }

  if (parking_charges) {
    conditions.push(`b.parking_charges::text ILIKE $${idx++}`);
    values.push(`%${parking_charges}%`);
  }

  if (waiting_charges) {
    conditions.push(`b.waiting_charges::text ILIKE $${idx++}`);
    values.push(`%${waiting_charges}%`);
  }

  if (extra_drop_charges) {
    conditions.push(`b.extra_drop_charges::text ILIKE $${idx++}`);
    values.push(`%${extra_drop_charges}%`);
  }

  if (meet_and_greet) {
    conditions.push(`b.meet_and_greet::text ILIKE $${idx++}`);
    values.push(`%${meet_and_greet}%`);
  }

  if (congestion_charges) {
    conditions.push(`b.congestion_charges::text ILIKE $${idx++}`);
    values.push(`%${congestion_charges}%`);
  }

  if (total_charges) {
    conditions.push(`b.total_charges::text ILIKE $${idx++}`);
    values.push(`%${total_charges}%`);
  }

  const sql = `
    ${ENRICHED_SELECT}
    WHERE ${conditions.join(" AND ")}
    ORDER BY b.pickup_date ASC, b.pickup_time ASC
  `;

  const res = await pool.query(sql, values);

  return res.rows;
};
