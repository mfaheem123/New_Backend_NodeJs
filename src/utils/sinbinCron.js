const cron = require("node-cron");
const db = require("../db");
const SinbinModel = require("../models/driverSinbinModel");

console.log("🚀 Sin Bin Cron Scheduler Started!");

// Har 30 second me check karega
cron.schedule("*/5 * * * * *", async () => {
  console.log("⏰ Checking expired Sin-Bins...");
  try {
    // 1. Fetch drivers jinka sinbin time expire ho chuka hai
    const query = `
      SELECT company_id, driver_id 
      FROM driver_sinbins 
      WHERE is_active = TRUE 
      AND (updated_at + (sinbin_time || ' minutes')::INTERVAL) <= CURRENT_TIMESTAMP;
    `;

    const { rows } = await db.query(query);

    if (rows.length === 0) return;

    // 2. Un sabhi drivers ka status update karein (Aapka Model automatically notification bhej dega)
    for (const record of rows) {
      await SinbinModel.updateDriverSinbin(record.company_id, {
        driver_id: record.driver_id,
        message: "Your hold is lifted — welcome back!",
        sinbin_time: 0,
        is_active: false, // Explicitly passing false triggers the removal notification in Model
      });

      console.log(
        `🔓 Auto-lifted Sin Bin and sent notification for Driver ID: ${record.driver_id}`,
      );
    }
  } catch (error) {
    console.error("❌ Sin Bin Cron Job Error:", error.message);
  }
});
