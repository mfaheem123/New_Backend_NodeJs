const db = require("../db");

module.exports = {
  // ADD CUSTOMER
  create: async (data) => {
    const query = `
      INSERT INTO customers (
        name, email, mobile, telephone, fax, door_number, address1, address2,
        blacklist, blacklist_reason, notes, username, password, web_device_id,
        mobile_device_id, email_verification_code, mobile_verification_code,
        email_verified, mobile_verified, email_verified_at, mobile_verified_at,
        sms_flag, otp_created_at, company_id
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24
      )
RETURNING id
    `;

    const values = [
      data.name || null,
      data.email || null,
      data.mobile || null,
      data.telephone || null,
      data.fax || null,
      data.door_number || null,
      data.address1 || null,
      data.address2 || null,
      data.blacklist || false,
      data.blacklist_reason || null,
      data.notes || null,
      data.username || null,
      data.password || null,
      data.web_device_id || null,
      data.mobile_device_id || null,
      data.email_verification_code || null,
      data.mobile_verification_code || null,
      false, // email_verified default false
      false, // mobile_verified default false
      null,
      null,
      data.sms_flag ?? true,
      data.otp_created_at || new Date(),
      data.company_id || 1,
    ];

    const { rows } = await db.query(query, values);
    return rows[0].id;
  },

  setRestrictedDrivers: async (customerId, drivers) => {
    console.log("🚀 Updating restricted drivers for customer:", customerId);

    // Step 1: Clean up old restricted drivers
    await db.query(
      `DELETE FROM customer_restricted_drivers WHERE customer_id = $1`,
      [customerId],
    );

    // Step 2: Defensive check
    if (!drivers || (Array.isArray(drivers) && drivers.length === 0)) {
      console.log("ℹ️ No restricted drivers to insert. Done!");
      return;
    }

    // Step 3: Normalize input (convert strings → objects)
    const normalizedDrivers = drivers
      .map((d) => {
        if (typeof d === "string") {
          try {
            return JSON.parse(d);
          } catch {
            console.warn("⚠️ Skipping malformed driver:", d);
            return null;
          }
        }
        return d;
      })
      .filter((d) => d && typeof d === "object");

    if (normalizedDrivers.length === 0) {
      console.log("ℹ️ No valid restricted drivers found after normalization.");
      return;
    }

    const insertQuery = `
    INSERT INTO customer_restricted_drivers (customer_id, driver_id, driver_username, driver_name)
    VALUES ($1, $2, $3, $4)
  `;

    // Step 4: Insert valid drivers
    for (const driver of normalizedDrivers) {
      const driverId = parseInt(driver.id, 10);
      const driverUsername = driver.username || null;
      const driverName = driver.name || null;

      if (!Number.isInteger(driverId)) {
        console.warn("⚠️ Skipping driver with invalid ID:", driver);
        continue;
      }

      console.log(
        `📤 Inserting -> customer_id: ${customerId}, driver_id: ${driverId}, username: ${driverUsername}, name: ${driverName}`,
      );

      try {
        await db.query(insertQuery, [
          customerId,
          driverId,
          driverUsername,
          driverName,
        ]);
      } catch (err) {
        console.error("❌ Error inserting driver:", driver, err.message);
      }
    }

    console.log("✅ All restricted drivers updated successfully!");
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];
    let index = 1;

    for (const [key, value] of Object.entries(data)) {
      // Skip restricted_drivers (handled separately)
      if (key === "restricted_drivers") continue;

      // Skip undefined or empty string values to preserve existing data
      if (value === undefined) continue;

      fields.push(`${key} = $${index}`);
      values.push(value);
      index++;
    }

    if (fields.length === 0) {
      console.log("⚠️ No valid fields to update for customer:", id);
      return;
    }

    const query = `
    UPDATE customers
    SET ${fields.join(", ")}
    WHERE id = $${index}
  `;

    values.push(id);

    console.log("🧾 Dynamic Update Query:", query);
    console.log("📦 Values:", values);

    await db.query(query, values);
  },

  getAll: async ({
    offset = 0,
    limit = 10,
    blacklist = false,
    filters = {},
  }) => {
    const conditions = ["c.blacklist = $1"];
    const params = [blacklist];
    let idx = 2;

    // 🔍 Dynamic search fields
    const searchFields = ["name", "mobile", "telephone", "email", "address1"];

    for (const [key, value] of Object.entries(filters)) {
      if (searchFields.includes(key) && value) {
        conditions.push(`LOWER(c.${key}) LIKE LOWER($${idx})`);
        params.push(`%${value}%`);
        idx++;
      }
      // ✅ COMPANY_ID FILTER (exact match)
      if (key === "company_id") {
        conditions.push(`c.company_id = $${idx}`);
        params.push(parseInt(value));
        idx++;
      }
    }

    // 🧩 Build WHERE clause
    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // 🧾 Main paginated query
    const query = `
    SELECT 
      c.id,
  c.name,
  c.email,
  c.mobile,
  c.telephone,
  c.fax,
  c.door_number,
  c.address1,
  c.address2,
  c.blacklist,
  c.blacklist_reason,
  c.notes,
  c.username,
  c.password,
  c.web_device_id,
  c.mobile_device_id,
  c.email_verification_code,
  c.mobile_verification_code,
  c.email_verified,
  c.mobile_verified,
  c.email_verified_at,
  c.mobile_verified_at,
  c.sms_flag,
  c.created_at,
  c.otp_created_at,
  c.profile_image,
  c.fcm_token,
  c.fcm_updated_at,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', d.driver_id,
            'username', d.driver_username,
            'name', d.driver_name
          )
        ) FILTER (WHERE d.driver_id IS NOT NULL),
        '[]'
      ) AS restricted_drivers
    FROM customers c
    LEFT JOIN customer_restricted_drivers d ON c.id = d.customer_id
    ${whereClause}
    GROUP BY c.id
    ORDER BY c.id DESC
    LIMIT $${idx} OFFSET $${idx + 1};
  `;

    params.push(limit, offset);

    const countQuery = `
    SELECT COUNT(*) AS total
    FROM customers c
    ${whereClause};
  `;

    const [dataRes, countRes] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, params.slice(0, idx - 1)), // 👈 only filters, no limit/offset
    ]);

    return {
      total: parseInt(countRes.rows[0].total, 10),
      customers: dataRes.rows,
    };
  },

  getById: async (id) => {
    const query = `
    SELECT 
      c.*,
      COALESCE(
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', d.driver_id,
            'username', d.driver_username,
            'name', d.driver_name
          )
        ) FILTER (WHERE d.driver_id IS NOT NULL),
        '[]'
      ) AS restricted_drivers
    FROM customers c
    LEFT JOIN customer_restricted_drivers d ON c.id = d.customer_id
    WHERE c.id = $1
    GROUP BY c.id
  `;

    const { rows } = await db.query(query, [id]);
    return rows[0];
  },

  getRestrictedDrivers: async (customerId) => {
    const { rows } = await db.query(
      `SELECT driver_id AS id, driver_username AS username, driver_name AS name
     FROM customer_restricted_drivers
     WHERE customer_id = $1`,
      [customerId],
    );
    return rows;
  },

  delete: async (id) => {
    try {
      // Step 1: Delete all restricted drivers linked to this customer
      await db.query(
        `DELETE FROM customer_restricted_drivers WHERE customer_id = $1`,
        [id],
      );

      // Step 2: Delete the customer itself
      const result = await db.query(`DELETE FROM customers WHERE id = $1`, [
        id,
      ]);

      // Step 3: Return info
      return result.rowCount > 0; // true if deleted, false if not found
    } catch (err) {
      console.error("❌ Error deleting customer:", err);
      throw err;
    }
  },

  searchByMobile: async (mobile) => {
    const query = `
        SELECT 
            id, sms_flag, name, mobile, email, telephone
        FROM customers
        WHERE mobile LIKE $1
    `;

    const result = await db.query(query, [`%${mobile}%`]);
    return result.rows;
  },

  findByEmail: async (email) => {
    const { rows } = await db.query(
      "SELECT id FROM customers WHERE email = $1 LIMIT 1",
      [email],
    );
    return rows[0] || null;
  },

  findByEmails: async (email) => {
    const { rows } = await db.query(
      `SELECT id, name, email
     FROM customers
     WHERE email = $1
     LIMIT 1`,
      [email],
    );

    return rows[0] || null;
  },

  findByEmailWithOTP: async (email) => {
    const { rows } = await db.query(
      `SELECT id, name, email, email_verification_code, otp_created_at
     FROM customers
     WHERE email = $1
     LIMIT 1`,
      [email],
    );

    return rows[0] || null;
  },

  markEmailVerified: async (id) => {
    await db.query(
      `UPDATE customers
     SET email_verified = true,
         email_verified_at = NOW(),
         email_verification_code = NULL,
         otp_created_at = NULL
     WHERE id = $1`,
      [id],
    );
  },

  updateOTP: async (id, otp, createdAt) => {
    await db.query(
      `UPDATE customers
     SET email_verification_code = $1,
         otp_created_at = $2,
         email_verified = false
     WHERE id = $3`,
      [otp, createdAt, id],
    );
  },

  findByEmailForLogin: async (email) => {
    const { rows } = await db.query(
      `SELECT *
     FROM customers
     WHERE email = $1
     LIMIT 1`,
      [email],
    );

    return rows[0] || null;
  },

  findByEmailPass: async (email) => {
    const { rows } = await db.query(
      `SELECT id, email, password
     FROM customers
     WHERE email = $1
     LIMIT 1`,
      [email],
    );

    return rows[0] || null;
  },

  updatePassword: async (email, hashedPassword) => {
    const { rowCount } = await db.query(
      `UPDATE customers
     SET password = $1
     WHERE email = $2`,
      [hashedPassword, email],
    );

    return rowCount > 0;
  },

  findById: async (id) => {
    const { rows } = await db.query(
      `SELECT id, email, password
     FROM customers
     WHERE id = $1
     LIMIT 1`,
      [id],
    );

    return rows[0] || null;
  },

  updatePasswordById: async (id, hashedPassword) => {
    const { rowCount } = await db.query(
      `UPDATE customers
     SET password = $1
     WHERE id = $2`,
      [hashedPassword, id],
    );

    return rowCount > 0;
  },

  updateProfileImage: async (id, image) => {
    await db.query(
      `UPDATE customers
     SET profile_image = $1
     WHERE id = $2`,
      [image, id],
    );
  },

  searchCustomerByMobile: async (mobile, company_id) => {
    const query = `
        SELECT 
            id, sms_flag, name, mobile, email, telephone, address1, address2
        FROM customers
        WHERE mobile LIKE $1 AND company_id = $2
    `;

    const result = await db.query(query, [`%${mobile}%`, company_id]);
    return result.rows;
  },
  updateCustomerFcmToken: async (customerId, fcmToken) => {
    const query = `
      UPDATE customers
      SET 
        fcm_token = $1,
        fcm_updated_at = NOW()
      WHERE id = $2
    `;
    await db.query(query, [fcmToken, customerId]);
    return true;
  },
};
