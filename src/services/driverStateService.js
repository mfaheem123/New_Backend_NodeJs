const db = require("../db");
const Driver = require("../models/driverModel");
const {
  notifyDriverLogin,
  notifyBusyDriverUpdate,
  notifyDriverBookingStatusWeb,
  notifyDriverSinBinStatusWeb,
} = require("../sockets/driverWebSocket");
const {
  notifyDriverBookingStatus,
} = require("../sockets/driverTrackingSocket");

const STATUS_MAP = {
  15: "Accepted",
  3: "On Route",
  6: "Arrived",
  9: "POB",
  10: "STC",
};

async function syncDriverState(driverId) {
  const driverRes = await db.query(`SELECT * FROM drivers WHERE id = $1`, [
    driverId,
  ]);
  if (!driverRes.rows.length) return null;
  const driver = driverRes.rows[0];

  if (driver.session_status !== "logged_in") {
    return driver;
  }

  // 1️⃣ Check Active Booking for TODAY (Accepted=15, On Route=3, Arrived=6, POB=9, STC=10)
  // Note: Future booking bhi agar aaj ki date ki hai aur accepted hai toh busy hogi
  // driverStateService.js ke andar activeBookingRes query:
const activeBookingRes = await db.query(
  `
  SELECT id, booking_status_id
  FROM bookings
  WHERE driver_id = $1
    AND booking_status_id IN (15, 6, 9, 3, 10)
    AND TO_DATE(pickup_date, 'YYYY-FMMM-FMDD') BETWEEN (CURRENT_DATE - INTERVAL '1 day') AND CURRENT_DATE
  ORDER BY 
    CASE booking_status_id 
      WHEN 10 THEN 1  -- STC (Highest Priority)
      WHEN 3  THEN 2  -- ON ROUTE
      WHEN 9  THEN 3  -- POB
      WHEN 6  THEN 4  -- ARRIVED
      WHEN 15 THEN 5  -- ACCEPTED
    END ASC,
    dispatched_at ASC
  LIMIT 1
  `,
  [driverId]
);

  let nextDriverStatus = "Available";
  let nextBookingStatus = "Available";

  if (activeBookingRes.rows.length > 0) {
    // 🔴 Driver has an active job -> BUSY LIST
    const activeJob = activeBookingRes.rows[0];
    nextDriverStatus = "Unavailable";
    nextBookingStatus = STATUS_MAP[activeJob.booking_status_id] || "Accepted";
  } else {
    // 2️⃣ Check Active SinBin
    const sinbinRes = await db.query(
      `
      SELECT id FROM driver_sinbins
      WHERE driver_id = $1 
        AND is_active = TRUE 
        AND (updated_at + (sinbin_time || ' minutes')::INTERVAL) > CURRENT_TIMESTAMP
      LIMIT 1
      `,
      [driverId],
    );

    if (sinbinRes.rows.length > 0) {
      // 🟠 Driver in SinBin -> AVAILABLE LIST (SinBin status)
      nextDriverStatus = "SinBin";
      nextBookingStatus = "Available";
    } else if (driver.driver_status === "On Break") {
      // 🟡 Driver On Break -> AVAILABLE LIST (On Break status)
      nextDriverStatus = "On Break";
      nextBookingStatus = "Available";
    } else {
      // 🟢 Normal Available (Pending booking status=2 ya Future booking next day ki ho tab bhi Available)
      nextDriverStatus = "Available";
      nextBookingStatus = "Available";
    }
  }

  // Update DB
  await Driver.updateDriverStatus(
    driverId,
    nextBookingStatus,
    nextDriverStatus,
  );

  // Fetch Fresh Enriched Driver
  const freshDriver = await Driver.getById(driverId);

  // Sync WebSockets (Available <-> Busy shifting + Status update)
  await notifyBusyDriverUpdate(freshDriver);
  await notifyDriverBookingStatusWeb(driverId);
  await notifyDriverBookingStatus(driverId);

  if (nextDriverStatus === "SinBin") {
    await notifyDriverSinBinStatusWeb(driverId);
  }

  return freshDriver;
}

module.exports = { syncDriverState };
