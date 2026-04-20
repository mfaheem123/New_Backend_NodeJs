const WebSocket = require("ws");
const logger = require("../utils/logger");
const db = require("../db");

// ==============================
// 📏 DISTANCE CALCULATION
// ==============================
function getDistanceInMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ==============================
// 🧠 MEMORY STORE
// ==============================
const lastDriverLocation = new Map(); // driverId -> { lat, lng }

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

      console.log("🚀 TRACKING:", data);

      if (!driverId || !lat || !lng) return;

      // ==============================
      // 1️⃣ DRIVER FETCH
      // ==============================
      const result = await db.query(
        `SELECT id, driver_status, booking_status, session_status, latitude, longitude
         FROM drivers WHERE id=$1`,
        [driverId]
      );

      if (!result.rows.length) return;

      const driver = result.rows[0];

      // ==============================
      // 2️⃣ PREVIOUS LOCATION
      // ==============================
      let prevLocation = lastDriverLocation.get(driverId);

      // 🔥 fallback (server restart case)
      if (!prevLocation && driver.latitude && driver.longitude) {
        prevLocation = {
          lat: parseFloat(driver.latitude),
          lng: parseFloat(driver.longitude),
        };
      }

      // ==============================
      // 3️⃣ DISTANCE CHECK
      // ==============================
      let shouldBroadcast = false;

      if (!prevLocation) {
        shouldBroadcast = true;
      } else {
        const distance = getDistanceInMeters(
          prevLocation.lat,
          prevLocation.lng,
          lat,
          lng
        );

        console.log(
          `📏 Driver ${driverId} moved: ${distance.toFixed(2)} meters`
        );

        if (distance >= 50) {
          shouldBroadcast = true;
        }
      }

      // update memory
      lastDriverLocation.set(driverId, { lat, lng });

      // ==============================
      // 4️⃣ UPDATE DB
      // ==============================
      await db.query(
        `UPDATE drivers SET latitude=$1, longitude=$2 WHERE id=$3`,
        [lat, lng, driverId]
      );

      // ==============================
      // 5️⃣ INSERT LOG (THROTTLED)
      // ==============================
      const now = Date.now();
      const last = lastSavedAt.get(driverId) || 0;

      if (now - last > 10000) {
        await db.query(
          `INSERT INTO driver_location_logs (driver_id, latitude, longitude)
           VALUES ($1,$2,$3)`,
          [driverId, lat, lng]
        );

        lastSavedAt.set(driverId, now);
      }

      // ==============================
      // 6️⃣ BROADCAST (ONLY IF MOVED)
      // ==============================
      if (shouldBroadcast) {
        const payload = JSON.stringify({
          event: "DRIVER_LOCATION_UPDATE",
          data: {
            id: driver.id,
            lat,
            lng,
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
      }

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
// 🟡 BOOKING STATUS EVENT
// ==============================
async function notifyDriverBookingStatus(driverId, lat = null, lng = null) {
  try {
    const result = await db.query(
      `SELECT id, booking_status, session_status, driver_status, latitude, longitude
       FROM drivers WHERE id=$1`,
      [driverId]
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