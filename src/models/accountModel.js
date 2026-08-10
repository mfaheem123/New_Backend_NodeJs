const db = require("../db");
const bcrypt = require("bcrypt");

// ---------------------------------------------------------
// CREATE ACCOUNT
// ---------------------------------------------------------
exports.createAccountWithRelations = async (data) => {
  try {
    await db.query("BEGIN");

    // Clean empty fields
    Object.keys(data).forEach((key) => {
      if (data[key] === "" || data[key] === undefined) data[key] = null;
    });

    // 🔐 Hash main account password (if provided)
    let hashedPassword = null;
    if (data.password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(data.password, saltRounds);
    }

    const accountQuery = `
        INSERT INTO accounts (
          subsidiary_id, subsidiary_bank_account_id, account_type, closed,
          name, code, email, password, mobile, telephone, fax, website,
          account_number, credit_card, address, payment_types, information,
          contact_name, background_color, foreground_color,
          agent_commission_type, agent_commission,
          admin_fees_type, admin_fees,
          account_fees_type, account_fees,
          has_booked_by, fare_controller, has_escort, has_vat,
          admin_fees_vat, account_fees_vat, has_order_number,
          dispatch_customer_text, confirmation_text, arrival_text,
          clear_job_text, bank_information, company_id
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,
          $27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39
        )
        RETURNING *;
      `;

    const values = [
      data.subsidiary_id,
      data.subsidiary_bank_account_id,
      data.account_type,
      data.closed,
      data.name,
      data.code,
      data.email,
      hashedPassword,
      data.mobile,
      data.telephone,
      data.fax,
      data.website,
      data.account_number,
      data.credit_card,
      data.address,
      data.payment_types,
      data.information,
      data.contact_name,
      data.background_color,
      data.foreground_color,
      data.agent_commission_type,
      data.agent_commission,
      data.admin_fees_type,
      data.admin_fees,
      data.account_fees_type,
      data.account_fees,
      data.has_booked_by,
      data.fare_controller,
      data.has_escort,
      data.has_vat,
      data.admin_fees_vat,
      data.account_fees_vat,
      data.has_order_number,
      data.dispatch_customer_text,
      data.confirmation_text,
      data.arrival_text,
      data.clear_job_text,
      data.bank_information,
      data.company_id,
    ];

    const accountRes = await db.query(accountQuery, values);
    const account = accountRes.rows[0];
    const accountId = account.id;

    // 🔹 Insert related tables

    // --- Web Logins ---
    if (Array.isArray(data.web_logins)) {
      for (const login of data.web_logins) {
        let webLoginPassword = null;
        if (login.password) {
          webLoginPassword = await bcrypt.hash(login.password, 10);
        }
        await db.query(
          `INSERT INTO web_logins (account_id, account_number, username, password, mobile, telephone)
            VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            accountId,
            login.account_number,
            login.username,
            webLoginPassword,
            login.mobile,
            login.telephone,
          ],
        );
      }
    }

    // --- Departments ---
    if (Array.isArray(data.departments)) {
      for (const dept of data.departments) {
        await db.query(
          `INSERT INTO departments (account_id, name) VALUES ($1,$2)`,
          [accountId, dept.name],
        );
      }
    }

    // --- Contacts ---
    if (Array.isArray(data.contacts)) {
      for (const contact of data.contacts) {
        let contactPassword = null;
        if (contact.password) {
          contactPassword = await bcrypt.hash(contact.password, 10);
        }
        await db.query(
          `INSERT INTO contacts (account_id, name, email, password, mobile, telephone)
            VALUES ($1,$2,$3,$4,$5,$6)`,
          [
            accountId,
            contact.name,
            contact.email,
            contactPassword,
            contact.mobile,
            contact.telephone,
          ],
        );
      }
    }

    // --- Order Numbers ---
    if (Array.isArray(data.order_numbers)) {
      for (const order of data.order_numbers) {
        await db.query(
          `INSERT INTO order_numbers (account_id, order_number)
            VALUES ($1,$2)`,
          [accountId, order.order_number],
        );
      }
    }

    // --- Company Addresses ---
    if (Array.isArray(data.company_addresses)) {
      for (const addr of data.company_addresses) {
        await db.query(
          `INSERT INTO company_addresses (account_id, address)
            VALUES ($1,$2)`,
          [accountId, addr.address],
        );
      }
    }

    await db.query("COMMIT");
    const { company_id, ...cleanAccount } = account;
    return cleanAccount;
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
};

// ---------------------------------------------------------
// GET ALL ACCOUNT WITH JOINS + PAGINATION + SEARCH
// ---------------------------------------------------------
exports.getAccounts = async ({ offset = 0, limit = 100, filters = {} }) => {
  const {
    account_type,
    name,
    address,
    email,
    mobile,
    telephone,
    contact_name,
    subsidiary,
    company_id,
    closed,
  } = filters;

  const conditions = [];
  const params = [];
  let idx = 1;

  // 🔹 Build WHERE conditions dynamically
  if (account_type) {
    conditions.push(`a.account_type = $${idx++}`);
    params.push(account_type);
  }
  if (name) {
    conditions.push(`a.name ILIKE $${idx++}`);
    params.push(`%${name}%`);
  }
  if (address) {
    conditions.push(`a.address ILIKE $${idx++}`);
    params.push(`%${address}%`);
  }
  if (email) {
    conditions.push(`a.email ILIKE $${idx++}`);
    params.push(`%${email}%`);
  }
  if (mobile) {
    conditions.push(`a.mobile ILIKE $${idx++}`);
    params.push(`%${mobile}%`);
  }
  if (telephone) {
    conditions.push(`a.telephone ILIKE $${idx++}`);
    params.push(`%${telephone}%`);
  }
  if (contact_name) {
    conditions.push(`a.contact_name ILIKE $${idx++}`);
    params.push(`%${contact_name}%`);
  }
  if (subsidiary) {
    conditions.push(`s.name ILIKE $${idx++}`);
    params.push(`%${subsidiary}%`);
  }
  if (company_id) {
    conditions.push(`a.company_id = $${idx++}`);
    params.push(company_id);
  }
  if (closed) {
    conditions.push(`a.closed = $${idx++}`);
    params.push(closed);
  }
  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  // --- Total count for pagination ---
  const countQuery = `
    SELECT COUNT(DISTINCT a.id) AS total
    FROM accounts a
    LEFT JOIN subsidiaries s ON a.subsidiary_id = s.id
    ${whereClause};
  `;
  const countResult = await db.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total) || 0;

  // --- Data query ---
  const dataQuery = `
SELECT
  a.*,

  -- departments
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', d.id,
      'account_id', d.account_id,
      'name', d.name
    )) FILTER (WHERE d.id IS NOT NULL),
    '[]'
  ) AS departments,

  -- contacts
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', c.id,
      'account_id', c.account_id,
      'name', c.name,
      'email', c.email,
      'password', c.password,
      'mobile', c.mobile,
      'telephone', c.telephone
    )) FILTER (WHERE c.id IS NOT NULL),
    '[]'
  ) AS contacts,

  -- order numbers
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', o.id,
      'account_id', o.account_id,
      'order_number', o.order_number
    )) FILTER (WHERE o.id IS NOT NULL),
    '[]'
  ) AS order_numbers,

  -- company addresses
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', ca.id,
      'account_id', ca.account_id,
      'address', ca.address
    )) FILTER (WHERE ca.id IS NOT NULL),
    '[]'
  ) AS company_addresses,

  -- web logins
  COALESCE(
    json_agg(DISTINCT jsonb_build_object(
      'id', wl.id,
      'account_id', wl.account_id,
      'account_number', wl.account_number,
      'username', wl.username,
      'password', wl.password,
      'mobile', wl.mobile,
      'telephone', wl.telephone
    )) FILTER (WHERE wl.id IS NOT NULL),
    '[]'
  ) AS web_logins,

  -- subsidiary
  jsonb_build_object(
    'id', s.id,
    'name', s.name,
    'telephone_number', s.telephone_number,
    'email', s.email
  ) AS subsidiary

FROM accounts a
LEFT JOIN departments d ON d.account_id = a.id
LEFT JOIN contacts c ON c.account_id = a.id
LEFT JOIN order_numbers o ON o.account_id = a.id
LEFT JOIN company_addresses ca ON ca.account_id = a.id
LEFT JOIN web_logins wl ON wl.account_id = a.id
LEFT JOIN subsidiaries s ON s.id = a.subsidiary_id

${whereClause}
GROUP BY a.id, s.id
ORDER BY a.id ASC
OFFSET $${idx++} LIMIT $${idx++};
`;

  params.push(offset, limit);
  const result = await db.query(dataQuery, params);

  return {
    accounts: result.rows.map(({ company_id, ...rest }) => rest),
    total,
  };
};

// ---------------------------------------------------------
// GET ACCOUNT BY ID
// ---------------------------------------------------------
exports.getAccountById = async (id) => {
  const result = await db.query(
    `
    SELECT
      a.*,
      COALESCE(json_agg(DISTINCT wl.*) FILTER (WHERE wl.id IS NOT NULL), '[]') AS web_logins,
      COALESCE(json_agg(DISTINCT d.*) FILTER (WHERE d.id IS NOT NULL), '[]') AS departments,
      COALESCE(json_agg(DISTINCT c.*) FILTER (WHERE c.id IS NOT NULL), '[]') AS contacts,
      COALESCE(json_agg(DISTINCT o.*) FILTER (WHERE o.id IS NOT NULL), '[]') AS order_numbers,
      COALESCE(json_agg(DISTINCT ca.*) FILTER (WHERE ca.id IS NOT NULL), '[]') AS company_addresses
    FROM accounts a
    LEFT JOIN web_logins wl ON wl.account_id = a.id
    LEFT JOIN departments d ON d.account_id = a.id
    LEFT JOIN contacts c ON c.account_id = a.id
    LEFT JOIN order_numbers o ON o.account_id = a.id
    LEFT JOIN company_addresses ca ON ca.account_id = a.id
    WHERE a.id = $1
    GROUP BY a.id;
  `,
    [id],
  );
  return result.rows[0];
};

// ---------------------------------------------------------
// UPDATE ACCOUNT BY ID
// ---------------------------------------------------------
exports.updateAccountWithRelations = async (id, data) => {
  try {
    await db.query("BEGIN");

    // 🧩 Clean up empty fields
    Object.keys(data).forEach((key) => {
      if (data[key] === "" || data[key] === undefined) data[key] = null;
    });

    // 🧩 Hash password if new one provided
    let hashedPassword = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
    }

    // --- Update main account fields dynamically ---
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      if (
        [
          "web_logins",
          "departments",
          "contacts",
          "order_numbers",
          "company_addresses",
        ].includes(key)
      )
        continue; // skip child tables

      fields.push(`${key} = $${index++}`);
      if (key === "password" && hashedPassword) {
        values.push(hashedPassword);
      } else {
        values.push(value);
      }
    }

    if (fields.length > 0) {
      values.push(id);
      await db.query(
        `UPDATE accounts SET ${fields.join(", ")} WHERE id = $${values.length}`,
        values,
      );
    }

    // 🧩 Handle child tables only if they are included in payload

    if (Array.isArray(data.web_logins)) {
      await db.query("DELETE FROM web_logins WHERE account_id = $1", [id]);
      for (const w of data.web_logins) {
        const pass = w.password ? await bcrypt.hash(w.password, 10) : null;
        await db.query(
          `INSERT INTO web_logins (account_id, account_number, username, password, mobile, telephone)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, w.account_number, w.username, pass, w.mobile, w.telephone],
        );
      }
    }

    if (Array.isArray(data.departments)) {
      await db.query("DELETE FROM departments WHERE account_id = $1", [id]);
      for (const d of data.departments) {
        await db.query(
          `INSERT INTO departments (account_id, name)
           VALUES ($1,$2)`,
          [id, d.name],
        );
      }
    }

    if (Array.isArray(data.contacts)) {
      await db.query("DELETE FROM contacts WHERE account_id = $1", [id]);
      for (const c of data.contacts) {
        const pass = c.password ? await bcrypt.hash(c.password, 10) : null;
        await db.query(
          `INSERT INTO contacts (account_id, name, email, password, mobile, telephone)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, c.name, c.email, pass, c.mobile, c.telephone],
        );
      }
    }

    if (Array.isArray(data.order_numbers)) {
      await db.query("DELETE FROM order_numbers WHERE account_id = $1", [id]);
      for (const o of data.order_numbers) {
        await db.query(
          `INSERT INTO order_numbers (account_id, order_number)
           VALUES ($1,$2)`,
          [id, o.order_number],
        );
      }
    }

    if (Array.isArray(data.company_addresses)) {
      await db.query("DELETE FROM company_addresses WHERE account_id = $1", [
        id,
      ]);
      for (const a of data.company_addresses) {
        await db.query(
          `INSERT INTO company_addresses (account_id, address)
           VALUES ($1,$2)`,
          [id, a.address],
        );
      }
    }

    await db.query("COMMIT");

    const updatedAccount = await db.query(
      "SELECT * FROM accounts WHERE id = $1",
      [id],
    );
    return updatedAccount.rows[0];
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
};

// ---------------------------------------------------------
// DELETE ACCOUNT BY ID
// ---------------------------------------------------------
exports.deleteAccountWithRelations = async (id) => {
  try {
    await db.query("BEGIN");

    await db.query("DELETE FROM web_logins WHERE account_id = $1", [id]);
    await db.query("DELETE FROM departments WHERE account_id = $1", [id]);
    await db.query("DELETE FROM contacts WHERE account_id = $1", [id]);
    await db.query("DELETE FROM order_numbers WHERE account_id = $1", [id]);
    await db.query("DELETE FROM company_addresses WHERE account_id = $1", [id]);
    const result = await db.query(
      "DELETE FROM accounts WHERE id = $1 RETURNING *",
      [id],
    );

    await db.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  }
};

// ---------------------------------------------------------
// GET ACCOUNT BY SUBSIDIARY ID
// ---------------------------------------------------------
exports.getAccountsBySubsidiary = async (subsidiary_id, company_id) => {
  const query = `
    SELECT
      a.id,a.subsidiary_id,a.account_type,a.name,a.email,a.mobile,a.payment_types,a.information,a.background_color,a.foreground_color,
      json_agg(DISTINCT jsonb_build_object('id', d.id, 'name', d.name)) AS departments,
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'telephone_number', s.telephone_number,
        'email', s.email
      ) AS subsidiary
    FROM accounts a
    LEFT JOIN departments d ON a.id = d.account_id
    LEFT JOIN subsidiaries s ON a.subsidiary_id = s.id
    WHERE a.subsidiary_id = $1 AND a.company_id = $2
    GROUP BY a.id, s.id
    ORDER BY a.id ASC;
  `;

  const result = await db.query(query, [subsidiary_id, company_id]);
  return result.rows;
};
