const pool = require("../db");
const { generateInvoiceNumber } = require("./documentNumberHelper");

exports.create = async (data) => {
  try {
    let {
      subsidiary_id,
      account_id,
      invoice_date,
      invoice_due_date,
      from_date,
      to_date,
      invoice_type,
      department_id,
      order_number,
      account_invoice_lineitems,
      invoice_number,
      amount,
    } = data;

    // 🧹 sanitize
    subsidiary_id = Number(subsidiary_id);
    account_id = Number(account_id);
    invoice_type = invoice_type?.trim();
    order_number = order_number?.trim() || "";
    department_id =
      department_id && department_id !== "null" ? Number(department_id) : null;
    amount = amount ? Number(amount) : 0;

    if (typeof account_invoice_lineitems === "string") {
      account_invoice_lineitems = JSON.parse(
        account_invoice_lineitems.replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":'),
      );
    }

    await pool.query("BEGIN");

    // 🔐 Generate invoice number
    await generateInvoiceNumber(subsidiary_id);

    // 📄 Insert invoice
    const invoiceRes = await pool.query(
      `INSERT INTO account_invoices (
        subsidiary_id,
        account_id,
        invoice_number,
        invoice_date,
        invoice_due_date,
        from_date,
        to_date,
        invoice_type,
        department_id,
        order_number,
        amount
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *`,
      [
        subsidiary_id,
        account_id,
        invoice_number,
        invoice_date,
        invoice_due_date,
        from_date,
        to_date,
        invoice_type,
        department_id,
        order_number,
        amount.toFixed(2),
      ],
    );

    const invoice = invoiceRes.rows[0];

    // 📦 Insert lineitems
    const insertedLineItems = [];

    if (Array.isArray(account_invoice_lineitems)) {
      for (const item of account_invoice_lineitems) {
        const lineRes = await pool.query(
          `INSERT INTO account_invoice_lineitems
           (account_invoice_id, booking_id, total_charges)
           VALUES ($1,$2,$3)
           RETURNING id, account_invoice_id, booking_id`,
          [invoice.id, item.booking_id, Number(item.total_charges || 0)],
        );

        insertedLineItems.push(lineRes.rows[0]);

        // 🔁 Update booking invoice_number
        await pool.query(
          `UPDATE bookings
           SET invoice_number = $1
           WHERE id = $2`,
          [invoice.invoice_number, item.booking_id],
        );
      }
    }

    await pool.query("COMMIT");

    return {
      account_invoice: {
        id: invoice.id,
        invoice_date: invoice.invoice_date,
        invoice_due_date: invoice.invoice_due_date,
        account_id: invoice.account_id,
        from_date: invoice.from_date,
        to_date: invoice.to_date,
        invoice_type: invoice.invoice_type,
        department_id: invoice.department_id,
        order_number: invoice.order_number,
        invoice_number: invoice.invoice_number,
        amount: Number(invoice.amount),
        status: invoice.status,
        stripe_customer_id: null,
        stripe_payment_id: null,
      },
      account_invoice_lineitems: {
        status: true,
        account_invoice_lineitems: insertedLineItems,
      },
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
};

exports.getAll = async ({
  offset = 0,
  limit = 10,
  search,
  from_date,
  to_date,
  status,
  invoice_number,
}) => {
  try {
    const conditions = [];
    const values = [];
    let idx = 1;

    // 🔎 Exact Invoice Number Filter
    if (invoice_number) {
      conditions.push(`ai.invoice_number ILIKE $${idx++}`);
      values.push(`%${invoice_number}%`);
    }

    // =========================
    // 🔍 GLOBAL SEARCH
    // =========================
    if (search) {
      conditions.push(`
        (
          ai.invoice_number ILIKE $${idx}
          OR a.name ILIKE $${idx}
          OR d.name ILIKE $${idx}
          OR ai.order_number ILIKE $${idx}
          OR CAST(ai.invoice_date AS TEXT) ILIKE $${idx}
          OR CAST(ai.invoice_due_date AS TEXT) ILIKE $${idx}
          OR ai.status ILIKE $${idx}
          OR CAST(ai.amount AS TEXT) ILIKE $${idx}
          OR s.name ILIKE $${idx}
        )
      `);
      values.push(`%${search}%`);
      idx++;
    }

    // =========================
    // 📅 DATE FILTER
    // =========================
    if (from_date) {
      conditions.push(`ai.invoice_date >= $${idx++}`);
      values.push(from_date);
    }

    if (to_date) {
      conditions.push(`ai.invoice_date <= $${idx++}`);
      values.push(to_date);
    }

    // =========================
    // 📌 STATUS FILTER
    // =========================
    if (status && status !== "ALL") {
      conditions.push(`ai.status = $${idx++}`);
      values.push(status.toLowerCase());
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // =========================
    // 🔢 COUNT QUERY
    // =========================
    const countQuery = `
      SELECT COUNT(*)
      FROM account_invoices ai
      LEFT JOIN accounts a ON ai.account_id = a.id
      LEFT JOIN subsidiaries s ON a.subsidiary_id = s.id
      LEFT JOIN departments d ON ai.department_id = d.id
      ${whereClause}
    `;

    const countRes = await pool.query(countQuery, values);
    const count = parseInt(countRes.rows[0].count);

    // =========================
    // 📄 DATA QUERY
    // =========================
    const dataQuery = `
      SELECT 
        ai.*,

        json_build_object(
          'name', a.name,
          'email', a.email,
          'subsidiary_id', a.subsidiary_id,

          'subsidiary',
          json_build_object(
            'id', s.id,
            'name', s.name
          )
        ) as account,

        CASE 
          WHEN d.id IS NOT NULL THEN 
            json_build_object(
              'id', d.id,
              'name', d.name
            )
          ELSE NULL
        END as department

      FROM account_invoices ai
      LEFT JOIN accounts a ON ai.account_id = a.id
      LEFT JOIN subsidiaries s ON a.subsidiary_id = s.id
      LEFT JOIN departments d ON ai.department_id = d.id

      ${whereClause}
      ORDER BY ai.id DESC
      OFFSET $${idx++}
      LIMIT $${idx}
    `;

    values.push(offset);
    values.push(limit);

    const dataRes = await pool.query(dataQuery, values);

    return {
      status: true,
      count,
      offset,
      limit,
      account_invoices: dataRes.rows,
    };
  } catch (err) {
    throw err;
  }
};

exports.update = async (id, data) => {
  try {
    await pool.query("BEGIN");

    const fields = [];
    const values = [];
    let idx = 1;

    const allowedFields = [
      "subsidiary_id",
      "account_id",
      "invoice_date",
      "invoice_due_date",
      "from_date",
      "to_date",
      "invoice_type",
      "department_id",
      "order_number",
      "amount",
      "status",
      "stripe_customer_id",
      "stripe_payment_id",
    ];

    for (const key of allowedFields) {
      if (data[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(data[key]);
      }
    }

    let invoice;

    if (fields.length > 0) {
      const updateQuery = `
        UPDATE account_invoices
        SET ${fields.join(", ")},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $${idx}
        RETURNING *
      `;

      values.push(id);

      const res = await pool.query(updateQuery, values);
      invoice = res.rows[0];
    } else {
      const res = await pool.query(
        `SELECT * FROM account_invoices WHERE id = $1`,
        [id],
      );
      invoice = res.rows[0];
    }

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // ===============================
    // 🔄 HANDLE LINEITEM UPDATE
    // ===============================

    let insertedLineItems = [];

    if (Array.isArray(data.account_invoice_lineitems)) {
      // delete old
      await pool.query(
        `DELETE FROM account_invoice_lineitems WHERE account_invoice_id = $1`,
        [id],
      );

      for (const item of data.account_invoice_lineitems) {
        const lineRes = await pool.query(
          `INSERT INTO account_invoice_lineitems
           (account_invoice_id, booking_id, total_charges)
           VALUES ($1,$2,$3)
           RETURNING id, account_invoice_id, booking_id`,
          [id, item.booking_id, Number(item.total_charges || 0)],
        );

        insertedLineItems.push(lineRes.rows[0]);

        await pool.query(
          `UPDATE bookings
           SET invoice_number = $1
           WHERE id = $2`,
          [invoice.invoice_number, item.booking_id],
        );
      }
    } else {
      // if no new lineitems sent, return existing ones
      const existing = await pool.query(
        `SELECT id, account_invoice_id, booking_id
         FROM account_invoice_lineitems
         WHERE account_invoice_id = $1`,
        [id],
      );

      insertedLineItems = existing.rows;
    }

    await pool.query("COMMIT");

    return {
      account_invoice: {
        id: invoice.id,
        invoice_date: invoice.invoice_date,
        invoice_due_date: invoice.invoice_due_date,
        account_id: invoice.account_id,
        from_date: invoice.from_date,
        to_date: invoice.to_date,
        invoice_type: invoice.invoice_type,
        department_id: invoice.department_id,
        order_number: invoice.order_number,
        invoice_number: invoice.invoice_number,
        amount: Number(invoice.amount),
        status: invoice.status,
        stripe_customer_id: invoice.stripe_customer_id,
        stripe_payment_id: invoice.stripe_payment_id,
      },
      account_invoice_lineitems: {
        status: true,
        account_invoice_lineitems: insertedLineItems,
      },
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
};

exports.delete = async (id) => {
  try {
    await pool.query("BEGIN");

    // 🔎 Check if invoice exists
    const checkRes = await pool.query(
      `SELECT * FROM account_invoices WHERE id = $1`,
      [id],
    );

    if (checkRes.rows.length === 0) {
      throw new Error("NOT_FOUND");
    }

    const invoice = checkRes.rows[0];

    // 🔁 Optional: Remove invoice_number from bookings
    await pool.query(
      `UPDATE bookings
       SET invoice_number = NULL
       WHERE invoice_number = $1`,
      [invoice.invoice_number],
    );

    // 🗑 Delete lineitems first
    await pool.query(
      `DELETE FROM account_invoice_lineitems WHERE account_invoice_id = $1`,
      [id],
    );

    // 🗑 Delete invoice
    await pool.query(`DELETE FROM account_invoices WHERE id = $1`, [id]);

    await pool.query("COMMIT");

    return {
      deleted_id: id,
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
};
