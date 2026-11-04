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
      company_id,
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
        amount,
        company_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
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
        company_id,
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

// ACCOUNT INVOICE MODEL
exports.getAll = async ({
  page = 1,
  limit = 100,
  from_date,
  to_date,
  status,
  invoice_number,
  account_name,
  department_name,
  order_number,
  amount,
  subsidiary_name,
  invoice_date,
  invoice_due_date,
  company_id,
}) => {
  try {
    const conditions = [];
    const values = [];
    let idx = 1;

    const offset = (page - 1) * limit;

    // 🏢 Company ID Filter
    if (company_id && company_id.trim() !== "") {
      conditions.push(`ai.company_id = $${idx++}`);
      values.push(company_id);
    }

    // 🔎 Case-Insensitive String Filters (ILIKE / LOWER)
    if (invoice_number && invoice_number.trim() !== "") {
      conditions.push(`ai.invoice_number ILIKE $${idx++}`);
      values.push(`%${invoice_number.trim()}%`);
    }

    if (account_name && account_name.trim() !== "") {
      conditions.push(`a.name ILIKE $${idx++}`);
      values.push(`%${account_name.trim()}%`);
    }

    if (department_name && department_name.trim() !== "") {
      conditions.push(`d.name ILIKE $${idx++}`);
      values.push(`%${department_name.trim()}%`);
    }

    if (order_number && order_number.trim() !== "") {
      conditions.push(`ai.order_number ILIKE $${idx++}`);
      values.push(`%${order_number.trim()}%`);
    }

    if (subsidiary_name && subsidiary_name.trim() !== "") {
      conditions.push(`s.name ILIKE $${idx++}`);
      values.push(`%${subsidiary_name.trim()}%`);
    }

    if (amount && amount.trim() !== "") {
      conditions.push(`CAST(ai.amount AS TEXT) ILIKE $${idx++}`);
      values.push(`%${amount.trim()}%`);
    }

    if (invoice_date && invoice_date.trim() !== "") {
      conditions.push(`CAST(ai.invoice_date AS TEXT) ILIKE $${idx++}`);
      values.push(`%${invoice_date.trim()}%`);
    }

    if (invoice_due_date && invoice_due_date.trim() !== "") {
      conditions.push(`CAST(ai.invoice_due_date AS TEXT) ILIKE $${idx++}`);
      values.push(`%${invoice_due_date.trim()}%`);
    }

    // 📅 Date Range Filter
    if (from_date && from_date.trim() !== "") {
      conditions.push(`ai.invoice_date >= $${idx++}`);
      values.push(from_date);
    }

    if (to_date && to_date.trim() !== "") {
      conditions.push(`ai.invoice_date <= $${idx++}`);
      values.push(to_date);
    }

    // 📌 Status Filter (Uppercased input like "PAID" ko bhi sahi handle karega)
    if (status && status.trim() !== "" && status.toLowerCase() !== "all") {
      conditions.push(`LOWER(ai.status) = LOWER($${idx++})`);
      values.push(status.trim());
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 🔢 COUNT QUERY
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
    const total_pages = Math.ceil(count / limit);

    // 📄 DATA QUERY
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
    const cleanedInvoices = dataRes.rows.map(({ company_id, ...rest }) => rest);

    return {
      status: true,
      count,
      page,
      total_pages,
      limit,
      account_invoices: cleanedInvoices,
    };
  } catch (err) {
    throw err;
  }
};

exports.getById = async (id) => {
  try {
    const query = `
      SELECT
        ai.*,
        
        -- Account Object
        json_build_object(
          'id', a.id,
          'subsidiary_id', a.subsidiary_id,
          'subsidiary_bank_account_id', a.subsidiary_bank_account_id,
          'account_type', a.account_type,
          'closed', a.closed,
          'name', a.name,
          'code', a.code,
          'email', a.email,
          'password', a.password,
          'mobile', a.mobile,
          'telephone', a.telephone,
          'fax', a.fax,
          'website', a.website,
          'account_number', a.account_number,
          'credit_card', a.credit_card,
          'address', a.address,
          'payment_types', a.payment_types,
          'information', a.information,
          'contact_name', a.contact_name,
          'background_color', a.background_color,
          'foreground_color', a.foreground_color,
          'agent_commission_type', a.agent_commission_type,
          'agent_commission', a.agent_commission,
          'admin_fees_type', a.admin_fees_type,
          'admin_fees', a.admin_fees,
          'account_fees_type', a.account_fees_type,
          'account_fees', a.account_fees,
          'has_booked_by', a.has_booked_by,
          'fare_controller', a.fare_controller,
          'has_escort', a.has_escort,
          'has_vat', a.has_vat,
          'admin_fees_vat', a.admin_fees_vat,
          'account_fees_vat', a.account_fees_vat,
          'has_order_number', a.has_order_number,
          'dispatch_customer_text', a.dispatch_customer_text,
          'confirmation_text', a.confirmation_text,
          'arrival_text', a.arrival_text,
          'clear_job_text', a.clear_job_text,
          'bank_information', a.bank_information,
          'subsidiary', json_build_object(
            'id', s.id,
            'name', s.name,
            'logo', s.logo,
            'background_color', s.background_color,
            'foreground_color', s.foreground_color,
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
        ) AS account,

        -- Department
        CASE 
          WHEN d.id IS NOT NULL THEN 
            json_build_object('id', d.id, 'name', d.name)
          ELSE NULL
        END AS account_department,

        -- Line items with booking details
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ail.id,
              'account_invoice_id', ail.account_invoice_id,
              'booking_id', ail.booking_id,
              'booking', jsonb_build_object(
                'id', b.id,
                'reference_number', b.reference_number,
                'pickup', b.pickup,
                'dropoff', b.dropoff,
                'pickup_date', b.pickup_date,
                'pickup_time', b.pickup_time,
                'viapoints', b.viapoints,
                'name', b.name,
                'fares', b.fares,
                'company_price', b.company_price,
                'parking_charges', b.parking_charges,
                'waiting_charges', b.waiting_charges,
                'extra_drop_charges', b.extra_drop_charges,
                'meet_and_greet', b.meet_and_greet,
                'congestion_charges', b.congestion_charges,
                'total_charges', b.total_charges,
                'department', b.department,
                'order_number', b.order_number,
                'vehicle_type', json_build_object('name', vt.name),
                'journey_type', json_build_object('journey_type', jt.journey_type),
                'payment_type', json_build_object(
                  'id', pt.id,
                  'name', pt.name
                )
              )
            )
          ) FILTER (WHERE ail.id IS NOT NULL),
          '[]'
        ) AS account_invoice_lineitems

      FROM account_invoices ai
      LEFT JOIN accounts a ON ai.account_id = a.id
      LEFT JOIN subsidiaries s ON a.subsidiary_id = s.id
      LEFT JOIN departments d ON ai.department_id = d.id

      LEFT JOIN account_invoice_lineitems ail ON ail.account_invoice_id = ai.id
      LEFT JOIN bookings b ON b.id = ail.booking_id
      LEFT JOIN vehicle_types vt ON b.vehicle_type_id = vt.id
      LEFT JOIN journey_types jt ON b.journey_type_id = jt.id
      LEFT JOIN payment_types pt ON b.payment_type_id = pt.id

      WHERE ai.id = $1
      GROUP BY ai.id, a.id, s.id, d.id
    `;

    const result = await pool.query(query, [id]);

    return {
      status: true,
      account_invoice: result.rows[0] || null,
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
