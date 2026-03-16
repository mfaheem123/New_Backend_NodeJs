const db = require("../db");


function randomLetters(length = 2) {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

class DriverRent {
  /* ================= CREATE ================= */

  static async create(data) {
    try {
      await db.query("BEGIN");

      // Normalize numbers
      data.driver_id = Number(data.driver_id);
      data.jobs_total = Number(data.jobs_total);
      data.rent_total = Number(data.rent_total);
      data.cash_jobs_total = Number(data.cash_jobs_total);
      data.account_jobs_total = Number(data.account_jobs_total);
      data.owed = Number(data.owed);
      data.old_balance = Number(data.old_balance);
      data.current_balance = Number(data.current_balance);

      // Parse lineitems if string
      if (typeof data.driver_rent_lineitems === "string") {
        data.driver_rent_lineitems = JSON.parse(
          data.driver_rent_lineitems,
        );
      }

      const transaction_number = randomLetters(2) + Math.floor(Date.now() / 1000);

      const insertQuery = `
        INSERT INTO driver_rents (
          transaction_number,
          transaction_date,
          driver_id,
          jobs_total,
          rent_total,
          cash_jobs_total,
          account_jobs_total,
          owed,
          old_balance,
          current_balance,
          from_date,
          to_date,
          payment_type,
          last_modified
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        )
        RETURNING *;
      `;

      const values = [
        transaction_number,
        data.transaction_date,
        data.driver_id,
        data.jobs_total,
        data.rent_total,
        data.cash_jobs_total,
        data.account_jobs_total,
        data.owed,
        data.old_balance,
        data.current_balance,
        data.from_date,
        data.to_date,
        null,
        data.last_modified,
      ];

      const result = await db.query(insertQuery, values);
      const rent = result.rows[0];

      /* Insert Line Items */
      const lineItems = [];
const bookingIds = [];

      for (const item of data.driver_rent_lineitems) {
        const li = await db.query(
          `INSERT INTO driver_rent_lineitems
           (driver_rent_id, booking_id)
           VALUES ($1,$2)
           RETURNING *`,
          [rent.id, item.booking_id],
        );

        lineItems.push(li.rows[0]);
        bookingIds.push(item.booking_id);

        // ✅ UPDATE BOOKING COMMISSION STATUS
 
      }
// if (bookingIds.length) {
//   await db.query(
//     `UPDATE bookings
//      SET commission = false,
//          commission_status = 'close'
//      WHERE id = ANY($1::int[])`,
//     [bookingIds]
//   );
// }
      /* Update Driver Balance */
      await db.query(
        `UPDATE drivers
          SET balance = $1
          WHERE id = $2`,
        [data.current_balance, data.driver_id],
      );

      await db.query("COMMIT");

      return { rent, lineItems };
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  }

  /* ================= DISTINCT ================= */

  static async getDistinct(offset, limit) {
    const query = `
    SELECT 
      dc.driver_id,
      COUNT(dc.id) AS count,
      MAX(dc.last_modified) AS last_modified,
      json_build_object(
        'name', d.name,
        'username', d.username,
        'driver_type', d.driver_type,
        'driver_rent', d.driver_commission,
        'pda_rent', d.pda_rent,
        'balance', d.balance,
        'active', d.active,
        'subsidiary_id', d.subsidiary_id
      ) AS driver
    FROM driver_rents dc
    JOIN drivers d ON dc.driver_id = d.id
    GROUP BY dc.driver_id, d.id
    ORDER BY MAX(dc.last_modified) DESC
    LIMIT $1 OFFSET $2
  `;

    const result = await db.query(query, [limit, offset]);

    return {
      count: result.rows.map((r) => ({
        driver_id: r.driver_id,
        id: r.driver_id,
        count: r.count,
        last_modified: r.last_modified,
      })),
      driver_rents: result.rows.map((r) => ({
        driver_id: r.driver_id,
        driver: r.driver,
      })),
    };
  }

  /* ================= BY DRIVER ================= */

  static async getByDriverId(driver_id) {
    const query = `
      SELECT dc.*,
      json_build_object(
        'username', d.username,
        'email', d.email,
        'subsidiary_id', d.subsidiary_id
      ) AS driver
      FROM driver_rents dc
      JOIN drivers d ON dc.driver_id = d.id
      WHERE dc.driver_id = $1
      ORDER BY dc.id DESC
    `;

    const result = await db.query(query, [driver_id]);

    return result.rows;
  }

  /* ================= GET BY ID ================= */

  static async getById(id) {
    const query = `
    SELECT 
      dc.id,
      dc.transaction_number,
      dc.transaction_date,
      dc.driver_id,
      dc.jobs_total ,
      dc.rent_total ,
      dc.cash_jobs_total ,
      dc.account_jobs_total ,
      dc.owed ,
      dc.old_balance ,
      dc.current_balance ,
      dc.from_date,
      dc.to_date,
      dc.payment_type,
      dc.last_modified,

      -- Limited Driver Object
      json_build_object(
        'id', d.id,
        'name', d.name,
        'username', d.username,
        'email', d.email,
        'driver_commission', d.driver_commission,
        'pda_rent', d.pda_rent,
        'balance', d.balance,
        'subsidiary_id', d.subsidiary_id
      ) AS driver

    FROM driver_rents dc
    JOIN drivers d ON dc.driver_id = d.id
    WHERE dc.id = $1
  `;

    const rentRes = await db.query(query, [id]);

    if (!rentRes.rows.length) return null;

    const lineItemsQuery = `
    SELECT 
      dcl.id,
      dcl.driver_rent_id,
      dcl.booking_id,

      json_build_object(
        'id', b.id,
        'reference_number', b.reference_number,
        'pickup_date', b.pickup_date,
        'pickup_time', b.pickup_time,
        'pickup', b.pickup,
        'dropoff', b.dropoff,
        'viapoints', b.viapoints,
        'name', b.name,
        'fares', b.fares::text,
        'parking_charges', b.parking_charges::text,
        'waiting_charges', b.waiting_charges::text,
        'extra_drop_charges', b.extra_drop_charges::text,
        'congestion_charges', b.congestion_charges::text,
        'total_charges', b.total_charges::text,
        'commission', b.commission,

        'journey_type', 
          json_build_object('journey_type', jt.journey_type),

        'payment_type',
          json_build_object('name', pt.name),

        'vehicle_type',
          json_build_object('name', vt.name),

        'account',
          CASE 
            WHEN a.id IS NOT NULL 
            THEN json_build_object('name', a.name)
            ELSE NULL
          END
      ) AS booking

    FROM driver_rent_lineitems dcl
    JOIN bookings b ON dcl.booking_id = b.id
    LEFT JOIN journey_types jt ON b.journey_type_id = jt.id
    LEFT JOIN payment_types pt ON b.payment_type_id = pt.id
    LEFT JOIN vehicle_types vt ON b.vehicle_type_id = vt.id
    LEFT JOIN accounts a ON b.account_id = a.id
    WHERE dcl.driver_rent_id = $1
  `;

    const lineItemsRes = await db.query(lineItemsQuery, [id]);

    rentRes.rows[0].driver_rent_lineitems = lineItemsRes.rows;

    return rentRes.rows[0];
  }

  static async update(id, data) {
    try {
      await db.query("BEGIN");

      const fields = [];
      const values = [];
      let index = 1;

      // Allowed fields only (security)
      const allowedFields = [
        "transaction_date",
        "driver_id",
        "jobs_total",
        "rent_total",
        "cash_jobs_total",
        "account_jobs_total",
        "owed",
        "old_balance",
        "current_balance",
        "from_date",
        "to_date",
        "payment_type",
        "last_modified",
      ];

      for (const key of allowedFields) {
        if (data[key] !== undefined) {
          fields.push(`${key} = $${index}`);
          values.push(data[key]);
          index++;
        }
      }

      if (fields.length > 0) {
        const updateQuery = `
        UPDATE driver_rents
        SET ${fields.join(", ")}
        WHERE id = $${index}
        RETURNING *;
      `;

        values.push(id);

        await db.query(updateQuery, values);
      }

      /* Optional LineItems Update */
      if (data.driver_rent_lineitems) {
        if (typeof data.driver_rent_lineitems === "string") {
          data.driver_rent_lineitems = JSON.parse(
            data.driver_rent_lineitems,
          );
        }

        // delete old lineitems
        await db.query(
          `DELETE FROM driver_rent_lineitems WHERE driver_rent_id = $1`,
          [id],
        );

        // insert new
        for (const item of data.driver_rent_lineitems) {
          await db.query(
            `INSERT INTO driver_rent_lineitems
           (driver_rent_id, booking_id)
           VALUES ($1,$2)`,
            [id, item.booking_id],
          );
        }
      }

      /* Update Driver Balance Only If Sent */
      if (data.current_balance !== undefined && data.driver_id !== undefined) {
        await db.query(`UPDATE drivers SET balance = $1 WHERE id = $2`, [
          data.current_balance,
          data.driver_id,
        ]);
      }

      await db.query("COMMIT");

      return await this.getById(id);
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  }

  static async delete(id) {
    try {
      await db.query("BEGIN");

      // 1️⃣ Get rent first
      const rentRes = await db.query(
        `SELECT driver_id, current_balance, old_balance
       FROM driver_rents
       WHERE id = $1`,
        [id],
      );

      if (!rentRes.rows.length) {
        throw new Error("Driver rent not found");
      }

      const rent = rentRes.rows[0];

      // 2️⃣ Restore driver balance to old_balance
      await db.query(
        `UPDATE drivers
       SET balance = $1
       WHERE id = $2`,
        [rent.old_balance, rent.driver_id],
      );

      // 3️⃣ Delete lineitems
      await db.query(
        `DELETE FROM driver_rent_lineitems
       WHERE driver_rent_id = $1`,
        [id],
      );

      // 4️⃣ Delete rent
      await db.query(
        `DELETE FROM driver_rents
       WHERE id = $1`,
        [id],
      );

      await db.query("COMMIT");
    } catch (err) {
      await db.query("ROLLBACK");
      throw err;
    }
  }
}

module.exports = DriverRent;
