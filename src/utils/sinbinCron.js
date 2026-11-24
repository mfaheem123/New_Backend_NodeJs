const cron = require("node-cron");
const db = require("../db");
const SinbinModel = require("../models/driverSinbinModel");
const { syncDriverState } = require("../services/driverStateService");

console.log("🚀 Sin Bin Cron Scheduler Started!");

// =========================================================
// 1️⃣ SIN BIN EXPIRY CRON (Har 100 second check karega)
// =========================================================
cron.schedule("*/1000 * * * * *", async () => {
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

// =========================================================
// 2️⃣ FUTURE BOOKING ACTIVATION CRON (Har 10 minute baad)
// =========================================================
cron.schedule("*/1000 * * * *", async () => {
  try {
    console.log("⏰ Checking Driver Future Bookings...");
    // Un logged-in drivers ko dhundein jinki accepted future booking aaj ki date ki hai
    // aur wo abhi Available list mein hain (d.driver_status != 'Unavailable')
    const query = `
      SELECT DISTINCT b.driver_id
      FROM bookings b
      INNER JOIN drivers d ON d.id = b.driver_id
      WHERE b.future = true
        AND b.booking_status_id = 15
        AND TO_DATE(b.pickup_date, 'YYYY-FMMM-FMDD') <= CURRENT_DATE
        AND d.session_status = 'logged_in'
        AND d.driver_status != 'Unavailable';
    `;

    const { rows } = await db.query(query);

    if (rows.length === 0) return;

    for (const row of rows) {
      // Ye driver ko Available list se nikal kar Busy list mein 'Accepted' status ke sath shift kar dega
      await syncDriverState(row.driver_id);
      console.log(
        `📅 Future booking activated today -> Driver ID ${row.driver_id} moved to Busy List`,
      );
    }
  } catch (error) {
    console.error("❌ Future Booking Cron Job Error:", error.message);
  }
});
