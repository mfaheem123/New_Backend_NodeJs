const WebSocket = require("ws");
const logger = require("../utils/logger");
const db = require("../db");

// Dashboard clients
const trackingDashboardClients = new Set();

// Throttle map
const lastSavedAt = new Map();

// ==============================
// 🟢 DASHBOARD SOCKET
// ==============================
function handleTrackingDashboardSocket(ws) {
  trackingDashboardClients.add(ws);

  logger.info("ws:tracking-dashboard-connected", {
    socketId: ws.id,
  });

  ws.on("close", () => {
    trackingDashboardClients.delete(ws);
    logger.info("ws:tracking-dashboard-disconnected", {
      socketId: ws.id,
    });
  });

  ws.on("error", (err) => {
    logger.error("ws:error", {
      socketId: ws.id,
      error: err.message,
    });
  });
}

// ==============================
// 🔴 DRIVER TRACKING SOCKET
// ==============================
function handleDriverTrackingSocket(ws) {
  logger.info("ws:driver-tracking-connected", {
    socketId: ws.id,
  });

  ws.on("message", async (message) => {
    try {
      const data = JSON.parse(message);

      const { driverId, lat, lng } = data;

      // ❗ validation
      if (!driverId || !lat || !lng) return;

      // ==============================
      // 1️⃣ DRIVER FETCH (ALL REQUIRED FIELDS)
      // ==============================
      const result = await db.query(
        `SELECT id, name, username, driver_status, booking_status, session_status
         FROM drivers WHERE id=$1`,
        [driverId],
      );

      if (!result.rows.length) return;

      const driver = result.rows[0];

      // ==============================
      // 2️⃣ UPDATE LATEST LOCATION
      // ==============================
      await db.query(
        `UPDATE drivers 
         SET latitude=$1, longitude=$2 
         WHERE id=$3`,
        [lat, lng, driverId],
      );

      // ==============================
      // 3️⃣ INSERT LOG (THROTTLED)
      // ==============================
      const now = Date.now();
      const last = lastSavedAt.get(driverId) || 0;

      if (now - last > 10000) {
        await db.query(
          `INSERT INTO driver_location_logs (driver_id, latitude, longitude)
           VALUES ($1,$2,$3)`,
          [driverId, lat, lng],
        );

        lastSavedAt.set(driverId, now);
      }

      // ==============================
      // 4️⃣ PREPARE DASHBOARD DATA
      // ==============================
      const driverData = {
        id: driver.id,
        lat,
        lng,
        booking_status: driver.booking_status,
        session_status: driver.session_status,
        driver_status: driver.driver_status,
      };

      // ==============================
      // 5️⃣ BROADCAST TRACKING
      // ==============================
      const payload = JSON.stringify({
        event: "DRIVER_LOCATION_UPDATE",
        data: driverData,
      });

      trackingDashboardClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });
    } catch (err) {
      logger.error("ws:tracking-message-error", {
        error: err.message,
      });
    }
  });

  ws.on("close", () => {
    logger.info("ws:driver-tracking-disconnected", {
      socketId: ws.id,
    });
  });

  ws.on("error", (err) => {
    logger.error("ws:error", {
      socketId: ws.id,
      error: err.message,
    });
  });
}

// ==============================
// 🟡 BOOKING STATUS EVENT (API SE CALL HOGA)
// ==============================
async function notifyDriverBookingStatus(driverId, lat = null, lng = null) {
  try {
    const result = await db.query(
      `SELECT id, booking_status, session_status, driver_status, latitude, longitude
       FROM drivers WHERE id=$1`,
      [driverId],
    );

    if (!result.rows.length) return;

    const driver = result.rows[0];

    const payload = JSON.stringify({
      event: "DRIVER_BOOKING_STATUS_UPDATE",
      data: {
        id: driver.id,
        lat: lat ?? driver.latitude,
        lng: lng ?? driver.longitude,
        booking_status: driver.booking_status,
        session_status: driver.session_status,
        driver_status: driver.driver_status,
      },
    });

    trackingDashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    logger.info("ws:booking-status-broadcast", {
      driverId: driver.id,
    });
  } catch (err) {
    logger.error("ws:booking-status-error", {
      error: err.message,
    });
  }
}

// ==============================
// EXPORTS
// ==============================
module.exports = {
  handleDriverTrackingSocket,
  handleTrackingDashboardSocket,
  notifyDriverBookingStatus,
};
