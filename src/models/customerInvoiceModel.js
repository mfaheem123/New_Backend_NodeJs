const pool = require("../db");

const ENRICHED_SELECT_GETBYID = `
SELECT
    b.id,
    b.reference_number,
    b.pickup_date,
    b.pickup_time,
    b.pickup,
    b.dropoff,
    b.viapoints,
    b.name,
    b.fares,
    b.parking_charges,
    b.waiting_charges,
    b.extra_drop_charges,
    b.meet_and_greet,
    b.congestion_charges,
    b.total_charges,

    json_build_object(
        'name', vt.name
    ) AS vehicle_type,

    json_build_object(
        'journey_type', jt.journey_type
    ) AS journey_type,

    json_build_object(
        'name', pt.name
    ) AS payment_type

FROM bookings b

LEFT JOIN vehicle_types vt
ON vt.id = b.vehicle_type_id

LEFT JOIN journey_types jt
ON jt.id = b.journey_type_id

LEFT JOIN payment_types pt
ON pt.id = b.payment_type_id
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

      AND ($6::text IS NULL OR LOWER(ci.status) = LOWER($6))

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
      ${ENRICHED_SELECT_GETBYID}
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

exports.update = async (id, payload) => {
  try {
    await pool.query("BEGIN");

    const invoiceResult = await pool.query(
      `
      UPDATE customer_invoices
      SET
        invoice_date = COALESCE($1, invoice_date),
        invoice_due_date = COALESCE($2, invoice_due_date),
        status = COALESCE($3, status),
        amount = COALESCE($4, amount),
        from_date = COALESCE($5, from_date),
        to_date = COALESCE($6, to_date),
        invoice_type = COALESCE($7, invoice_type),
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
      `,
      [
        payload.invoice_date ?? null,
        payload.invoice_due_date ?? null,
        payload.status ?? null,
        payload.amount ?? null,
        payload.from_date ?? null,
        payload.to_date ?? null,
        payload.invoice_type ?? null,
        id,
      ],
    );

    if (!invoiceResult.rows.length) {
      throw new Error("Invoice not found");
    }

    const invoice = invoiceResult.rows[0];

    if (Array.isArray(payload.customer_invoice_lineitems)) {
      // purani bookings ka invoice_number remove
      const oldItems = await pool.query(
        `
        SELECT booking_id
        FROM customer_invoice_lineitems
        WHERE customer_invoice_id = $1
        `,
        [id],
      );

      for (const item of oldItems.rows) {
        await pool.query(
          `
          UPDATE bookings
          SET invoice_number = NULL
          WHERE id = $1
          `,
          [item.booking_id],
        );
      }

      // purane lineitems delete
      await pool.query(
        `
        DELETE FROM customer_invoice_lineitems
        WHERE customer_invoice_id = $1
        `,
        [id],
      );

      // naye insert
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
          [id, item.booking_id],
        );

        await pool.query(
          `
          UPDATE bookings
          SET invoice_number = $1
          WHERE id = $2
          `,
          [invoice.invoice_number, item.booking_id],
        );
      }
    }

    const lineItems = await pool.query(
      `
      SELECT *
      FROM customer_invoice_lineitems
      WHERE customer_invoice_id = $1
      ORDER BY id
      `,
      [id],
    );

    await pool.query("COMMIT");

    return {
      customer_invoice: invoice,
      customer_invoice_lineitems: lineItems.rows,
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
};
