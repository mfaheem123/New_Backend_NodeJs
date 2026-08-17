const pool = require("../db");
const CompanySubscription = require("../models/companySubscriptionModel");
const companyWebSocket = require("../sockets/companyWebSocket");

// 1. Subscription Create / Assign Route
const createTestSubscription = async (req, res) => {
  try {
    const { company_id, plan_id, payment_status } = req.body;
    const targetPlanId = plan_id || 1;

    // 🚀 STEP 1: Database se Plan Details aur uske Duration Days fetch karein
    const planResult = await pool.query(
      `SELECT id, name, duration_days FROM subscription_plans WHERE id = $1`,
      [targetPlanId]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        status: false,
        message: `Plan ID ${targetPlanId} not found in subscription_plans table`,
      });
    }

    const plan = planResult.rows[0];
    // Plan ke duration_days uthain (agar DB mein null ho toh default 30)
    const planDuration = Number(plan.duration_days) || 30;

    // 🚀 STEP 2: Expiry Days decide karein
    // Agar request body mein custom `days_offset` bheja hai (testing ke liye), toh woh use karein.
    // Agar body mein `days_offset` nahi hai, toh Plan ke apne `duration_days` (e.g. Monthly=30, Yearly=365) apply honge.
    const daysOffset =
      req.body.days_offset !== undefined
        ? Number(req.body.days_offset)
        : planDuration;

    const startAt = new Date();
    const expiryAt = new Date();

    // 🚀 STEP 3: Start Date mein Plan / Offset Days add karein
    expiryAt.setDate(startAt.getDate() + daysOffset);

    // Previous active/expired subscription close karein
    await pool.query(
      `UPDATE company_subscriptions SET status = 'CANCELLED' WHERE company_id = $1`,
      [company_id]
    );

    const status = daysOffset <= 0 ? "EXPIRED" : "ACTIVE";
    const payStatus = payment_status || "UNPAID";

    const query = `
      INSERT INTO company_subscriptions (company_id, plan_id, start_at, expiry_at, status, payment_status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [
      company_id,
      targetPlanId,
      startAt,
      expiryAt,
      status,
      payStatus,
    ]);

    return res.status(200).json({
      status: true,
      message: `Subscription created successfully for plan '${plan.name}' (${planDuration} days)`,
      subscription: rows[0],
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
      companyWebSocket.sendGraceDaysLeftWarning(
        comp.company_id,
        comp.days_left,
      );
    }

    return res.json({
      status: true,
      message: "Morning warnings pushed via WebSocket",
      pushedPreExpiry: preExpiryList.length,
      pushedGrace: graceList.length,
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
      lockedCount: lockedCompanies.length,
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
        message: "Valid 'days' parameter is required in body",
      });
    }

    // 1. DB mein Grace Period Update karein
    const updatedSub = await CompanySubscription.createGrace(company_id, days);

    if (!updatedSub) {
      return res.status(404).json({
        status: false,
        message:
          "No active or valid subscription record found for this company",
      });
    }

    // 2. Client ko real-time WebSocket Alert bhejein
    companyWebSocket.sendGraceDaysLeftWarning(company_id, days);

    return res.status(200).json({
      status: true,
      message: `Grace period of ${days} days granted successfully`,
      reason: reason || "Extension granted by Super Admin",
      subscription: updatedSub,
    });
  } catch (error) {
    console.error("Error giving grace period:", error);
    return res.status(500).json({
      status: false,
      error: error.message,
    });
  }
};

module.exports = {
  createTestSubscription,
  triggerMorningWarnings,
  triggerMidnightLogout,
  giveGracePeriod,
};
