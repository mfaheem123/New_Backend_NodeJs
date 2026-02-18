const db = require("../db");

class DriverCommission {
  /* ================= CREATE ================= */

  static async create(data) {
    const client = await db.connect();

    try {
      await client.query("BEGIN");

      const transaction_number = "at" + Math.floor(Date.now() / 1000);

      const insertQuery = `
        INSERT INTO driver_commissions (
          transaction_number,
          transaction_date,
          driver_id,
          jobs_total,
          commission_total,
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
        data.commission_total,
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

      const result = await client.query(insertQuery, values);
      const commission = result.rows[0];

      /* Insert Line Items */
      const lineItems = [];

      for (const item of data.driver_commission_lineitems) {
        const li = await client.query(
          `INSERT INTO driver_commission_lineitems
           (driver_commission_id, booking_id)
           VALUES ($1,$2)
           RETURNING *`,
          [commission.id, item.booking_id],
        );

        lineItems.push(li.rows[0]);
      }

      /* Update Driver Balance */
      await client.query(
        `UPDATE drivers
         SET balance = $1,
             last_modified = CURRENT_DATE
         WHERE id = $2`,
        [data.current_balance, data.driver_id],
      );

      await client.query("COMMIT");

      return { commission, lineItems };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  /* ================= DISTINCT ================= */

  static async getDistinct(offset, limit) {
    const countQuery = `
      SELECT driver_id, driver_id AS id,
      COUNT(*) AS count,
      MAX(last_modified) AS last_modified
      FROM driver_commissions
      GROUP BY driver_id
      ORDER BY last_modified DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(countQuery, [limit, offset]);

    const driversQuery = `
      SELECT DISTINCT d.id AS driver_id,
      json_build_object(
        'name', d.name,
        'username', d.username,
        'driver_type', d.driver_type,
        'driver_commission', d.driver_commission,
        'pda_rent', d.pda_rent,
        'balance', d.balance,
        'active', d.active,
        'subsidiary_id', d.subsidiary_id,
        'last_modified', d.last_modified
      ) AS driver
      FROM driver_commissions dc
      JOIN drivers d ON dc.driver_id = d.id
      ORDER BY d.last_modified DESC
      LIMIT $1 OFFSET $2
    `;

    const drivers = await db.query(driversQuery, [limit, offset]);

    return {
      count: result.rows,
      driver_commissions: drivers.rows,
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
      FROM driver_commissions dc
      JOIN drivers d ON dc.driver_id = d.id
      WHERE dc.driver_id = $1
      ORDER BY dc.id DESC
    `;

    const result = await db.query(query, [driver_id]);

    return result.rows;
  }

  /* ================= GET BY ID ================= */

  static async getById(id) {
    const commissionQuery = `
      SELECT dc.*,
      row_to_json(d) AS driver
      FROM driver_commissions dc
      JOIN drivers d ON dc.driver_id = d.id
      WHERE dc.id = $1
    `;

    const commission = await db.query(commissionQuery, [id]);

    if (!commission.rows.length) return null;

    const lineItemsQuery = `
      SELECT *
      FROM driver_commission_lineitems
      WHERE driver_commission_id = $1
    `;

    const lineItems = await db.query(lineItemsQuery, [id]);

    commission.rows[0].driver_commission_lineitems = lineItems.rows;

    return commission.rows[0];
  }
}

module.exports = DriverCommission;
