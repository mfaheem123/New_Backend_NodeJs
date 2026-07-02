const pool = require("../db");

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

exports.createCustomerInvoice = async (payload) => {
  try {
    await pool.query("BEGIN");

    const invoice = await pool.query(
      `
      INSERT INTO customer_invoices
      (
        invoice_number,
        customer_id,
        invoice_date,
        invoice_due_date,
        from_date,
        to_date,
        invoice_type,
        amount
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        payload.invoice_number,
        payload.customer_id,
        payload.invoice_date,
        payload.invoice_due_date,
        payload.from_date,
        payload.to_date,
        payload.invoice_type,
        payload.amount,
      ],
    );

    const invoiceId = invoice.rows[0].id;

    for (const item of payload.customer_invoice_lineitems) {
      await pool.query(
        `
        INSERT INTO customer_invoice_lineitems
        (
          customer_invoice_id,
          booking_id
        )
        VALUES ($1,$2)
        `,
        [invoiceId, item.booking_id],
      );

      await pool.query(
        `
        UPDATE bookings
        SET invoice_number = $1
        WHERE id = $2
        `,
        [payload.invoice_number, item.booking_id],
      );
    }

    const lineItems = await pool.query(
      `
  SELECT *
  FROM customer_invoice_lineitems
  WHERE customer_invoice_id = $1
  ORDER BY id
  `,
      [invoiceId],
    );
    await pool.query("COMMIT");

    return {
      customer_invoice: invoice.rows[0],
      customer_invoice_lineitems: lineItems.rows,
    };
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
};

exports.getAllCustomerInvoices = async (offset, limit, filters) => {
  const {
    invoice_type,
    invoice_number,
    customer,
    invoice_date,
    invoice_due_date,
    status,
    amount,
  } = filters;

  const sql = `
    SELECT
      ci.*,
      json_build_object(
        'name', c.name,
        'email', c.email
      ) AS customer

    FROM customer_invoices ci

    LEFT JOIN customers c
      ON c.id = ci.customer_id

    WHERE
      ($1::text IS NULL OR ci.invoice_type = $1)

      AND ($2::text IS NULL OR ci.invoice_number ILIKE '%' || $2 || '%')

      AND ($3::text IS NULL OR c.name ILIKE '%' || $3 || '%')

      AND ($4::text IS NULL OR ci.invoice_date ILIKE '%' || $4 || '%')

AND ($5::text IS NULL OR ci.invoice_due_date ILIKE '%' || $5 || '%')

      AND (
  $6::text IS NULL
  OR LOWER(ci.status) = LOWER($6)
)

      AND ($7::text IS NULL OR CAST(ci.amount AS TEXT) ILIKE '%' || $7 || '%')

    ORDER BY ci.id DESC

    OFFSET $8
    LIMIT $9
  `;

  const { rows } = await pool.query(sql, [
    invoice_type || null,
    invoice_number || null,
    customer || null,
    invoice_date || null,
    invoice_due_date || null,
    status || null,
    amount || null,
    offset,
    limit,
  ]);

  return rows;
};

exports.payCustomerInvoice = async (id, status) => {
  const sql = `
    UPDATE customer_invoices
    SET
      status = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  const { rows } = await pool.query(sql, [status, id]);

  return rows[0];
};

exports.deleteCustomerInvoice = async (id) => {
  const sql = `
    DELETE FROM customer_invoices
    WHERE id = $1
    RETURNING *
  `;

  const { rows } = await pool.query(sql, [id]);

  return rows[0];
};

exports.getById = async (id) => {
  const invoiceResult = await pool.query(
    `
    SELECT
      ci.*,

      json_build_object(
        'id', c.id,
        'name', c.name,
        'email', c.email,
        'mobile', c.mobile,
        'telephone', c.telephone
      ) customer

    FROM customer_invoices ci

    LEFT JOIN customers c
    ON c.id = ci.customer_id

    WHERE ci.id = $1
    `,
    [id],
  );

  if (!invoiceResult.rows.length) {
    return null;
  }

  const invoice = invoiceResult.rows[0];

  const lineItems = await pool.query(
    `
    SELECT *
    FROM customer_invoice_lineitems
    WHERE customer_invoice_id = $1
    ORDER BY id
    `,
    [id],
  );

  const enrichedItems = [];

  for (const item of lineItems.rows) {
    const bookingResult = await pool.query(
      `
      ${ENRICHED_SELECT}
      WHERE b.id = $1
      `,
      [item.booking_id],
    );

    enrichedItems.push({
      ...item,
      booking: bookingResult.rows[0] || null,
    });
  }

  invoice.customer_invoice_lineitems = enrichedItems;

  return invoice;
};

exports.update = async (id, data) => {
  const { invoice_date, invoice_due_date, status } = data;

  const { rows } = await pool.query(
    `
    UPDATE customer_invoices
    SET
      invoice_date = $1,
      invoice_due_date = $2,
      status = $3,
      updated_at = NOW()
    WHERE id = $4
    RETURNING *
    `,
    [invoice_date, invoice_due_date, status, id],
  );

  return rows[0];
};
