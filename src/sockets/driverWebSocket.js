const WebSocket = require("ws");
const db = require("../db");
const logger = require("../utils/logger");
const { URL } = require("url");
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
    vehicle_no: driver.vehicle?.vehicle_number || null,
    make: driver.vehicle?.make || null,
    model: driver.vehicle?.model || null,
    color: driver.vehicle?.color || null,
  };
}

//Driver Login Socket
function handleDriverLoginSocket(ws, req) {
  const { searchParams } = new URL(req.url, "http://localhost");
  ws.company_id = Number(searchParams.get("company_id"));
  console.log("Socket Company ID:", ws.company_id);

  dashboardClients.add(ws);
  logger.info("ws:dashboard-connected", {
    socketId: ws.id,
    company_id: ws.company_id,
  });

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

async function handleBusyDriverSocket(ws, req) {
  const { searchParams } = new URL(req.url, "http://localhost");

  ws.company_id = Number(searchParams.get("company_id"));

  busyDashboardClients.add(ws);

  logger.info("ws:busy-dashboard-connected", {
    socketId: ws.id,
    company_id: ws.company_id,
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
  console.log("Driver Company ID: ", driver.company_id);
  dashboardClients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.company_id === driver.company_id
    ) {
      client.send(payload);
    }
  });
}

// Driver Logout Notify At Web
function notifyDriverLogout(driverId) {
  const driver = loggedInDrivers.get(driverId) || busyDrivers.get(driverId);

  loggedInDrivers.delete(driverId);
  busyDrivers.delete(driverId);
  if (!driver) return;

  const payload = JSON.stringify({
    event: "DRIVER_LOGOUT",
    data: { driverId },
  });
  console.log("Driver Company ID: ", driver.company_id);

  dashboardClients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.company_id === driver.company_id
    ) {
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
    // Driver busy list se remove
    busyDrivers.delete(driver.id);
    // =================================================
    // 🚫 ALREADY AVAILABLE → DO NOT SEND AGAIN
    // =================================================
    const existingAvailable = loggedInDrivers.get(driver.id);

    if (existingAvailable) {
      logger.info("Already available, skip", {
        driverId: driver.id,
      });

      return;
    }

    // =================================================
    // FIRST TIME AVAILABLE
    // =================================================
    loggedInDrivers.set(driver.id, driver);

    const payload = JSON.stringify({
      event: "DRIVER_LOGIN",
      data: formatDriverData(driver),
    });
    console.log("Driver Company ID: ", driver.company_id);

    // AVAILABLE DASHBOARD
    dashboardClients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.company_id === driver.company_id
      ) {
        client.send(payload);
      }
    });

    // =================================================
    // 🔥 BUSY SOCKET → REMOVE DRIVER
    // =================================================
    const busyPayload = JSON.stringify({
      event: "BUSY_DRIVER_REMOVE", // ⚠️ Flutter me else hit karega
      data: {
        id: driver.id,
      },
    });
    console.log("Driver Company ID: ", driver.company_id);

    busyDashboardClients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.company_id === driver.company_id
      ) {
        client.send(busyPayload);
      }
    });

    return;
  }

  // =====================================================
  // 🔴 DRIVER BUSY
  // =====================================================
  const existingBusy = busyDrivers.get(driver.id);
  // 🚫 ALREADY BUSY → DO NOT SEND AGAIN
  if (existingBusy) {
    logger.info("Already busy, skip");
    return;
  }

  // Available list se remove
  loggedInDrivers.delete(driver.id);

  // Busy list mein add
  busyDrivers.set(driver.id, driver);
  // 🔴 DRIVER BUSY → ADD
  const payload = JSON.stringify({
    event: "BUSY_DRIVER_UPDATE",
    data: formatDriverData(driver), // ✅ only required fields
  });
  console.log("Driver Company ID: ", driver.company_id);

  busyDashboardClients.forEach((client) => {
    if (
      client.readyState === WebSocket.OPEN &&
      client.company_id === driver.company_id
    ) {
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
      d.has_pda,
      
      -- Vehicle Type (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN vt_cv.name
        ELSE vt_v.name
      END AS vehicle_type,

      -- Vehicle Number (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN cv.vehicle_number
        ELSE v.vehicle_number
      END AS vehicle_no,

      -- Vehicle Make (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN cv.make
        ELSE v.make
      END AS make,

      -- Vehicle Model (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN cv.model
        ELSE v.model
      END AS model,

      -- Vehicle Color (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN cv.color
        ELSE v.color
      END AS color

    FROM drivers d

    -- Company vehicle joins
    LEFT JOIN company_vehicles cv 
      ON cv.id = d.company_vehicle_id

    LEFT JOIN vehicle_types vt_cv 
      ON vt_cv.id = cv.vehicle_type_id

    -- Personal vehicle joins
    LEFT JOIN vehicles v 
      ON v.id = d.vehicle_id

    LEFT JOIN vehicle_types vt_v 
      ON vt_v.id = v.vehicle_type_id
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
        if (
          client.readyState === WebSocket.OPEN &&
          client.company_id === driver.company_id
        ) {
          client.send(payload);
        }
      });

      return;
    }

    // BUSY → busy dashboard
    busyDashboardClients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.company_id === driver.company_id
      ) {
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
      d.has_pda,
      
      -- Vehicle Type (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN vt_cv.name
        ELSE vt_v.name
      END AS vehicle_type,

      -- Vehicle Number (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN cv.vehicle_number
        ELSE v.vehicle_number
      END AS vehicle_no,

      -- Vehicle Make (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN cv.make
        ELSE v.make
      END AS make,

      -- Vehicle Model (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN cv.model
        ELSE v.model
      END AS model,

      -- Vehicle Color (Dynamic)
      CASE 
        WHEN d.use_company_vehicle = true THEN cv.color
        ELSE v.color
      END AS color

    FROM drivers d

    -- Company vehicle joins
    LEFT JOIN company_vehicles cv 
      ON cv.id = d.company_vehicle_id

    LEFT JOIN vehicle_types vt_cv 
      ON vt_cv.id = cv.vehicle_type_id

    -- Personal vehicle joins
    LEFT JOIN vehicles v 
      ON v.id = d.vehicle_id

    LEFT JOIN vehicle_types vt_v 
      ON vt_v.id = v.vehicle_type_id
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
        vehicle_no: driver.vehicle_no,
        make: driver.make,
        model: driver.model,
        color: driver.color,
      
      },
    });

    // ✅ SIRF AVAILABLE DASHBOARD KO SEND HOGA
    dashboardClients.forEach((client) => {
      if (
        client.readyState === WebSocket.OPEN &&
        client.company_id === driver.company_id
      ) {
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
