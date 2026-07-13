const WebSocket = require("ws");
const db = require("../db");
const logger = require("../utils/logger");
const {
  getAvailableLoggedInDrivers,
  getBusyLoggedInDrivers,
} = require("../models/driverModel");

// Sirf dashboard sockets
const dashboardClients = new Set();
const busyDashboardClients = new Set();

function hasDriverStateChanged(existing, incoming) {
  if (!existing) return true;

  return (
    existing.booking_status !== incoming.booking_status ||
    existing.driver_status !== incoming.driver_status ||
    existing.session_status !== incoming.session_status ||
    existing.latitude !== incoming.latitude ||
    existing.longitude !== incoming.longitude
  );
}

// Logged-in drivers list (memory)
const loggedInDrivers = new Map();

// Busy drivers list (memory)
const busyDrivers = new Map();

function formatDriverData(driver) {
  return {
    id: driver.id,
    name: driver.name,
    username: driver.username,
    zone: driver.zone,
    latitude: driver.latitude,
    longitude: driver.longitude,
    booking_status: driver.booking_status,
    session_status: driver.session_status,
    driver_status: driver.driver_status,
    vehicle_type: driver.vehicle?.vehicle_type?.name || null,
    last_login_at: driver.last_login_at,
  };
}

//Driver Login Socket
function handleDriverLoginSocket(ws) {
  dashboardClients.add(ws);
  logger.info("ws:dashboard-connected", { socketId: ws.id });

  // 1️⃣ Sirf available logged in drivers bhejo
  const availableDrivers = Array.from(loggedInDrivers.values()).filter(
    (driver) =>
      driver.session_status === "logged_in" &&
      driver.booking_status === "Available" &&
      driver.driver_status === "Available",
  );

  // 2️⃣ Subscribe future updates
  const driverLoginListener = (driver) => {
    if (driver.session_status !== "logged_in") return;
    if (driver.booking_status !== "Available") return;
    if (driver.driver_status !== "Available") return;

    ws.send(JSON.stringify({ event: "DRIVER_LOGIN", data: driver }));
  };

  const driverLogoutListener = (driverId) => {
    ws.send(JSON.stringify({ event: "DRIVER_LOGOUT", data: { driverId } }));
  };

  ws.on("close", () => {
    dashboardClients.delete(ws);
    logger.info("ws:dashboard-disconnect", { socketId: ws.id });
  });

  ws.on("error", (err) => {
    logger.error("ws:error", { socketId: ws.id, error: err.message });
  });
}

async function handleBusyDriverSocket(ws) {
  busyDashboardClients.add(ws);

  logger.info("ws:busy-dashboard-connected", {
    socketId: ws.id,
  });

  ws.on("close", () => {
    busyDashboardClients.delete(ws);
  });

  ws.on("error", (err) => {
    logger.error("ws:error", {
      socketId: ws.id,
      error: err.message,
    });
  });
}

// Driver Login Notify At Web
function notifyDriverLogin(driver) {
  // Sirf available logged-in drivers allow
  if (
    driver.session_status !== "logged_in" ||
    driver.booking_status !== "Available" ||
    driver.driver_status !== "Available"
  ) {
    return;
  }

  const existing = loggedInDrivers.get(driver.id);

  // 🚫 Already available → skip
  if (!hasDriverStateChanged(existing, driver)) {
    logger.info("ws:skip-duplicate-available", {
      driverId: driver.id,
    });

    return;
  }
  loggedInDrivers.set(driver.id, driver);

  const payload = JSON.stringify({
    event: "DRIVER_LOGIN",
    data: formatDriverData(driver),
  });

  dashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Driver Logout Notify At Web
function notifyDriverLogout(driverId) {
  loggedInDrivers.delete(driverId);
  busyDrivers.delete(driverId);

  const payload = JSON.stringify({
    event: "DRIVER_LOGOUT",
    data: { driverId },
  });

  dashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });

  logger.info("ws:driver-logout", {
    driverId,
  });
}
function notifyBusyDriverUpdate(driver) {
  console.log("BUSY CLIENTS:", busyDashboardClients.size);

  if (driver.session_status !== "logged_in") return;

  // 🟢 DRIVER AVAILABLE → REMOVE FROM BUSY
  if (
    driver.booking_status === "Available" &&
    driver.driver_status === "Available"
  ) {
    busyDrivers.delete(driver.id);
    const existing = loggedInDrivers.get(driver.id);

    // Already available → skip
    if (!hasDriverStateChanged(existing, driver)) {
      return;
    }
    // available dashboard ke liye (existing logic)
    loggedInDrivers.set(driver.id, driver);

    const payload = JSON.stringify({
      event: "DRIVER_LOGIN",
      data: formatDriverData(driver),
    });

    dashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    // 🔥 BUSY SOCKET → REMOVE (important for Flutter)
    const busyPayload = JSON.stringify({
      event: "BUSY_DRIVER_REMOVE", // ⚠️ Flutter me else hit karega
      data: {
        id: driver.id,
      },
    });

    busyDashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(busyPayload);
      }
    });

    return;
  }
  // BUSY
  const existingBusy = busyDrivers.get(driver.id);
  // 🚫 Already busy → skip
  if (!hasDriverStateChanged(existingBusy, driver)) {
    logger.info("ws:skip-duplicate-busy", {
      driverId: driver.id,
    });

    return;
  }

  loggedInDrivers.delete(driver.id);

  busyDrivers.set(driver.id, driver);
  // 🔴 DRIVER BUSY → ADD
  const payload = JSON.stringify({
    event: "BUSY_DRIVER_UPDATE",
    data: formatDriverData(driver), // ✅ only required fields
  });

  busyDashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ==============================
// DRIVER BOOKING STATUS UPDATE
// ==============================
async function notifyDriverBookingStatusWeb(driverId) {
  try {
    const result = await db.query(
      `
      SELECT
        d.id,
        d.name,
        d.username,
        d.zone,
        d.latitude,
        d.longitude,
        d.booking_status,
        d.session_status,
        d.driver_status,
        d.last_login_at,
        vt.name AS vehicle_type
      FROM drivers d
      LEFT JOIN vehicles v
        ON d.vehicle_id=v.id
      LEFT JOIN vehicle_types vt
        ON v.vehicle_type_id=vt.id
      WHERE d.id=$1
      `,
      [driverId],
    );

    if (!result.rows.length) return;

    const driver = result.rows[0];

    if (driver.session_status !== "logged_in") return;

    const payload = JSON.stringify({
      event: "DRIVER_BOOKING_STATUS_WEB_UPDATE",
      data: {
        ...formatDriverData(driver),
        vehicle: {
          vehicle_type: {
            name: driver.vehicle_type,
          },
        },
      },
    });

    // AVAILABLE → dashboard
    if (
      driver.booking_status === "Available" &&
      driver.driver_status === "Available"
    ) {
      dashboardClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      });

      return;
    }

    // BUSY → busy dashboard
    busyDashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    logger.info("ws:driver-booking-status-web-update", {
      driverId,
    });
  } catch (err) {
    logger.error("ws:driver-booking-status-web-error", {
      error: err.message,
    });
  }
}

// ==============================
// DRIVER BREAK STATUS UPDATE
// ==============================
async function notifyDriverBreakStatusWeb(driverId) {
  try {
    const result = await db.query(
      `
      SELECT
        d.id,
        d.name,
        d.username,
        d.zone,
        d.latitude,
        d.longitude,
        d.booking_status,
        d.session_status,
        d.driver_status,
        d.last_login_at,
        vt.name AS vehicle_type
      FROM drivers d
      LEFT JOIN vehicles v
        ON d.vehicle_id=v.id
      LEFT JOIN vehicle_types vt
        ON v.vehicle_type_id=vt.id
      WHERE d.id=$1
      `,
      [driverId],
    );

    if (!result.rows.length) return;

    const driver = result.rows[0];

    if (driver.session_status !== "logged_in") return;

    const payload = JSON.stringify({
      event: "DRIVER_BREAK_STATUS_UPDATE",
      data: {
        id: driver.id,
        name: driver.name,
        username: driver.username,
        zone: driver.zone,
        latitude: driver.latitude,
        longitude: driver.longitude,
        booking_status: driver.booking_status,
        session_status: driver.session_status,
        driver_status: driver.driver_status,
        vehicle_type: driver.vehicle_type,
        last_login_at: driver.last_login_at,
      },
    });

    // ✅ SIRF AVAILABLE DASHBOARD KO SEND HOGA
    dashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    logger.info("ws:driver-break-status-update", {
      driverId,
      driver_status: driver.driver_status,
    });
  } catch (err) {
    logger.error("ws:driver-break-error", {
      error: err.message,
    });
  }
}

module.exports = {
  handleDriverLoginSocket,
  notifyDriverLogin,
  notifyDriverLogout,
  notifyBusyDriverUpdate,
  handleBusyDriverSocket,
  notifyDriverBookingStatusWeb,
  notifyDriverBreakStatusWeb,
};
