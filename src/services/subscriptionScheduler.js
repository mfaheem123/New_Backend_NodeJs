const cron = require("node-cron");
const CompanySubscription = require("../models/companySubscriptionModel");
const companyWebSocket = require("../sockets/companyWebSocket");

function startSubscriptionScheduler() {
  // ========================================================
  // 1. ROZANA SUBAH 09:00 AM — WARNINGS & DAYS LEFT POPUPS
  // ========================================================
  // Cron syntax: '0 9 * * *' = Daily at 09:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ Running Daily Subscription Warnings Job...");
    try {
      // A) Expiry se 3 din pehle wali companies
      const preExpiryList = await CompanySubscription.getPreExpiryCompanies(3);
      for (const comp of preExpiryList) {
        companyWebSocket.sendPreExpiryWarning(comp.company_id, comp.days_left);
      }

      // B) Extra days (Grace Period) chalne wali companies
      const graceList = await CompanySubscription.getActiveGraceCompanies();
      for (const comp of graceList) {
        companyWebSocket.sendGraceDaysLeftWarning(
          comp.company_id,
          comp.days_left,
        );
      }
    } catch (error) {
      console.error("Error sending daily warnings:", error);
    }
  });

  // ========================================================
  // 2. ROZANA RAAT 12:00 AM (00:00) — ACCOUNT LOCK & LOGOUT
  // ========================================================
  cron.schedule("0 0 * * *", async () => {
    console.log("🔒 Running Midnight Force Logout Cron Job...");
    try {
      const lockedCompanies = await CompanySubscription.getLockedCompanies();

      for (const comp of lockedCompanies) {
        // Send Force Logout event
        companyWebSocket.sendForceLogout(comp.company_id);
        console.log(
          `🔒 Force logout triggered for Company ID: ${comp.company_id}`,
        );
      }
    } catch (error) {
      console.error("Error in Midnight Lock Cron:", error);
    }
  });

  console.log("✅ Daily Subscription Scheduler Initialized");
}

module.exports = { startSubscriptionScheduler };
