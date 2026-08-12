const pool = require("../db");

const getByCompanyId = async (companyId) => {
  const query = `
    SELECT
      cs.*,
      sp.name AS plan_name,
      sp.duration_days,
      cc.company_name
    FROM company_subscriptions cs
    LEFT JOIN subscription_plans sp
      ON sp.id = cs.plan_id
    LEFT JOIN company_clients cc
      ON cc.id = cs.company_id
    WHERE cs.company_id = $1
    ORDER BY cs.id DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [companyId]);

  return rows[0] || null;
};


const getValidSubscription = async (companyId) => {
  const query = `
    SELECT
      cs.*,
      sp.name AS plan_name,
      cc.company_name
    FROM company_subscriptions cs
    LEFT JOIN subscription_plans sp
      ON sp.id = cs.plan_id
    LEFT JOIN company_clients cc
      ON cc.id = cs.company_id
    WHERE cs.company_id = $1
      AND cs.status = 'ACTIVE'
      AND cs.payment_status = 'PAID'
      AND NOW() < cs.expiry_at
    ORDER BY cs.expiry_at DESC
    LIMIT 1
  `;

  const { rows } = await pool.query(query, [companyId]);

  return rows[0] || null;
};


const getExpiredCompanies = async () => {
  const query = `
    SELECT
      cs.*,
      cc.company_name
    FROM company_subscriptions cs
    LEFT JOIN company_clients cc
      ON cc.id = cs.company_id
    WHERE cs.status = 'ACTIVE'
      AND cs.expiry_at <= NOW()
  `;

  const { rows } = await pool.query(query);

  return rows;
};


// Company ko Grace Period (Extra Days) dene ke liye
const createGrace = async (company_id, days) => {
  const query = `
    UPDATE company_subscriptions
    SET 
      grace_until = NOW() + ($1 || ' days')::INTERVAL,
      status = 'ACTIVE',
      updated_at = NOW()
    WHERE company_id = $2 
      AND status != 'CANCELLED'
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [days, company_id]);
  return rows[0];
};


const renewSubscription = async ({
  companyId,
  planId,
  startAt,
  expiryAt,
}) => {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");

    // Old subscription close
    await client.query(
      `
      UPDATE company_subscriptions
      SET
        status = 'CANCELLED',
        updated_at = NOW()
      WHERE company_id = $1
        AND status IN ('ACTIVE', 'EXPIRED')
      `,
      [companyId]
    );

    const result = await client.query(
      `
      INSERT INTO company_subscriptions
      (
        company_id,
        plan_id,
        start_at,
        expiry_at,
        status,
        payment_status,
        grace_until,
        force_logout_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        'ACTIVE',
        'PAID',
        NULL,
        NULL
      )
      RETURNING *
      `,
      [
        companyId,
        planId,
        startAt,
        expiryAt,
      ]
    );

    await client.query("COMMIT");

    return result.rows[0];

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();
  }
};

// Expired subscriptions fetch karne ke liye (Warnings bhejney ke liye)
const getExpiredForWarning = async () => {
  const query = `
    SELECT company_id, grace_until, expiry_at
    FROM company_subscriptions
    WHERE (
      (expiry_at <= NOW() AND grace_until IS NULL)
      OR 
      (grace_until IS NOT NULL AND NOW() > grace_until)
    )
    AND payment_status != 'PAID'
    AND status != 'CANCELLED'
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Grace period end hone par Force Logout ke liye
const getForceLogoutCompanies = async () => {
  const query = `
    SELECT company_id
    FROM company_subscriptions
    WHERE force_logout_at IS NOT NULL
      AND NOW() >= force_logout_at
      AND payment_status != 'PAID'
      AND status != 'CANCELLED'
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// 1. Expiry se 3 din pehle tak ki companies fetch karna
const getPreExpiryCompanies = async (noticeDays = 3) => {
  const query = `
    SELECT 
      company_id, 
      expiry_at,
      CEIL(EXTRACT(EPOCH FROM (expiry_at - NOW())) / 86400) AS days_left
    FROM company_subscriptions
    WHERE status = 'ACTIVE'
      AND payment_status != 'PAID'
      AND expiry_at > NOW()
      AND expiry_at <= NOW() + ($1 || ' days')::INTERVAL
  `;
  const { rows } = await pool.query(query, [noticeDays]);
  return rows;
};

// 2. Active Grace Period wali companies fetch karna (Extra Days)
const getActiveGraceCompanies = async () => {
  const query = `
    SELECT 
      company_id, 
      grace_until,
      CEIL(EXTRACT(EPOCH FROM (grace_until - NOW())) / 86400) AS days_left
    FROM company_subscriptions
    WHERE payment_status != 'PAID'
      AND grace_until IS NOT NULL
      AND grace_until >= NOW()
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// 3. Jinki expiry + grace dono khatam ho chuke hain (Account Lock / Logout)
const getLockedCompanies = async () => {
  const query = `
    SELECT company_id
    FROM company_subscriptions
    WHERE payment_status != 'PAID'
      AND status != 'CANCELLED'
      AND (
        (grace_until IS NOT NULL AND NOW() > grace_until)
        OR
        (grace_until IS NULL AND NOW() > expiry_at)
      )
  `;
  const { rows } = await pool.query(query);
  return rows;
};

module.exports = {
  getByCompanyId,
  getValidSubscription,
  getExpiredCompanies,
  createGrace,
  renewSubscription,
  getPreExpiryCompanies,  // <-- ADD THIS
  getActiveGraceCompanies, // <-- ADD THIS
  getLockedCompanies      // <-- ADD THIS
};