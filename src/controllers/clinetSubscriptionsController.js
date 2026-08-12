const pool = require("../db");
const CompanySubscription = require("../models/companySubscriptionModel");
const companyWebSocket = require("../sockets/companyWebSocket");

// 1. Subscription Create / Assign Route
const createTestSubscription = async (req, res) => {
  try {
    const { company_id, plan_id, days_offset, payment_status } = req.body;
    // days_offset: Expiry kitne din baad ya pehle ki rakhni hai (e.g., 2 = 2 days in future, -1 = expired 1 day ago)

    const startAt = new Date();
    const expiryAt = new Date();
    expiryAt.setDate(startAt.getDate() + (days_offset || 30));

    // Previous active/expired sub close karein
    await pool.query(
      `UPDATE company_subscriptions SET status = 'CANCELLED' WHERE company_id = $1`,
      [company_id]
    );

    const query = `
      INSERT INTO company_subscriptions (company_id, plan_id, start_at, expiry_at, status, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const status = days_offset <= 0 ? 'EXPIRED' : 'ACTIVE';
    const payStatus = payment_status || 'UNPAID';

    const { rows } = await pool.query(query, [company_id, plan_id || 1, startAt, expiryAt, status, payStatus]);

    return res.status(200).json({
      status: true,
      message: "Test subscription created successfully",
      subscription: rows[0]
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 2. Trigger Morning Warnings (09:00 AM Cron Manual Bypass)
const triggerMorningWarnings = async (req, res) => {
  try {
    const preExpiryList = await CompanySubscription.getPreExpiryCompanies(3);
    for (const comp of preExpiryList) {
      companyWebSocket.sendPreExpiryWarning(comp.company_id, comp.days_left);
    }

    const graceList = await CompanySubscription.getActiveGraceCompanies();
    for (const comp of graceList) {
      companyWebSocket.sendGraceDaysLeftWarning(comp.company_id, comp.days_left);
    }

    return res.json({
      status: true,
      message: "Morning warnings pushed via WebSocket",
      pushedPreExpiry: preExpiryList.length,
      pushedGrace: graceList.length
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

// 3. Trigger Midnight Logout (00:00 AM Cron Manual Bypass)
const triggerMidnightLogout = async (req, res) => {
  try {
    const lockedCompanies = await CompanySubscription.getLockedCompanies();
    for (const comp of lockedCompanies) {
      companyWebSocket.sendForceLogout(comp.company_id);
    }

    return res.json({
      status: true,
      message: "Midnight Force Logout pushed via WebSocket",
      lockedCount: lockedCompanies.length
    });
  } catch (error) {
    return res.status(500).json({ status: false, error: error.message });
  }
};

const giveGracePeriod = async (req, res) => {
  try {
    const { company_id } = req.params;
    const { days, reason } = req.body;

    if (!days || isNaN(days)) {
      return res.status(400).json({
        status: false,
        message: "Valid 'days' parameter is required in body"
      });
    }

    // 1. DB mein Grace Period Update karein
    const updatedSub = await CompanySubscription.createGrace(company_id, days);

    if (!updatedSub) {
      return res.status(404).json({
        status: false,
        message: "No active or valid subscription record found for this company"
      });
    }

    // 2. Client ko real-time WebSocket Alert bhejein
    companyWebSocket.sendGraceDaysLeftWarning(company_id, days);

    return res.status(200).json({
      status: true,
      message: `Grace period of ${days} days granted successfully`,
      reason: reason || "Extension granted by Super Admin",
      subscription: updatedSub
    });

  } catch (error) {
    console.error("Error giving grace period:", error);
    return res.status(500).json({
      status: false,
      error: error.message
    });
  }
};

module.exports = {
  createTestSubscription,
  triggerMorningWarnings,
  triggerMidnightLogout,
  giveGracePeriod
};