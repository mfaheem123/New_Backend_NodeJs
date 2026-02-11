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

exports.getAll = async ({ offset = 0, limit = 100, invoice_type }) => {
  try {
    const conditions = [];
    const values = [];
    let idx = 1;

    if (invoice_type) {
      conditions.push(`ai.invoice_type = $${idx++}`);
      values.push(invoice_type);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 🔢 Count Query
    const countQuery = `
      SELECT COUNT(*) 
      FROM account_invoices ai
      ${whereClause}
    `;

    const countRes = await pool.query(countQuery, values);
    const count = parseInt(countRes.rows[0].count);

    // 📄 Main Query
    const dataQuery = `
      SELECT 
        ai.*,

        -- Account
        json_build_object(
          'name', a.name,
          'email', a.email,
          'has_vat', a.has_vat,
          'admin_fees', a.admin_fees,
          'admin_fees_type', a.admin_fees_type,
          'admin_fees_vat', a.admin_fees_vat,
          'bank_information', a.bank_information,
          'subsidiary_id', a.subsidiary_id,

          -- Subsidiary
          'subsidiary',
          json_build_object(
            'id', s.id,
            'logo', s.logo,
            'background_color', s.background_color,
            'foreground_color', s.foreground_color,
            'name', s.name,
            'telephone_number', s.telephone_number,
            'emergency_contact_number', s.emergency_contact_number,
            'email', s.email,
            'fax', s.fax,
            'website', s.website,
            'address', s.address,
            'sort_code', s.sort_code,
            'account_number', s.account_number,
            'account_title', s.account_title,
            'bank', s.bank,
            'company_number', s.company_number,
            'vat_number', s.vat_number,
            'iban', s.iban,
            'balance', s.balance,
            'currency', s.currency,
            'web_access_token', s.web_access_token,
            'mobile_access_token', s.mobile_access_token,
            'maximum_drivers', s.maximum_drivers,
            'active_drivers', s.active_drivers,
            'address_latitude', s.address_latitude,
            'address_longitude', s.address_longitude
          )
        ) as account,

        -- Department
        CASE 
          WHEN d.id IS NOT NULL THEN 
            json_build_object(
              'id', d.id,
              'name', d.name
            )
          ELSE NULL
        END as departments

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
      account_invoices: dataRes.rows,
    };
  } catch (err) {
    throw err;
  }
};
