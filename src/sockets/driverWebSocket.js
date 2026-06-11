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

// Logged-in drivers list (memory)
const loggedInDrivers = new Map();

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

  // // 1️⃣ Current state bhej do
  // ws.send(
  //   JSON.stringify({
  //     event: "DRIVER_LIST",
  //     data: availableDrivers,
  //   }),
  // );

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

//OLD CODE
// async function handleBusyDriverSocket(ws) {
//   busyDashboardClients.add(ws);

//   logger.info("ws:busy-dashboard-connected", {
//     socketId: ws.id,
//   });

//   try {
//     const drivers = await getBusyLoggedInDrivers();

//     ws.send(
//       JSON.stringify({
//         event: "BUSY_DRIVER_LIST",
//         data: drivers,
//       }),
//     );
//   } catch (error) {
//     logger.error("ws:busy-driver-list-error", {
//       error: error.message,
//     });
//   }

//   ws.on("close", () => {
//     busyDashboardClients.delete(ws);
//   });

//   ws.on("error", (err) => {
//     logger.error("ws:error", {
//       socketId: ws.id,
//       error: err.message,
//     });
//   });
// }

async function handleBusyDriverSocket(ws) {
  busyDashboardClients.add(ws);

  logger.info("ws:busy-dashboard-connected", {
    socketId: ws.id,
  });

  // try {
  //   const drivers = await getBusyLoggedInDrivers();

  //   // 🔥 LIST ko UPDATE events me convert karo
  //   drivers.forEach((driver) => {
  //     const payload = JSON.stringify({
  //       event: "BUSY_DRIVER_UPDATE",
  //       data: formatDriverData(driver),
  //     });

  //     ws.send(payload);
  //   });
  // } catch (error) {
  //   logger.error("ws:busy-driver-list-error", {
  //     error: error.message,
  //   });
  // }

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
  loggedInDrivers.set(driver.id, driver);

  // ✅ Only required fields for frontend
  const driverData = {
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

  const payload = JSON.stringify({
    event: "DRIVER_LOGIN",
    data: driverData,
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
    // available dashboard ke liye (existing logic)
    loggedInDrivers.set(driver.id, driver);

    const availablePayload = JSON.stringify({
      event: "DRIVER_LOGIN",
      data: formatDriverData(driver),
    });

    dashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(availablePayload);
      }
    });

    // 🔥 BUSY SOCKET → REMOVE (important for Flutter)
    const busyPayload = JSON.stringify({
      event: "BUSY_DRIVER_REMOVE", // ⚠️ Flutter me else hit karega
      data: { id: driver.id },
    });

    busyDashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(busyPayload);
      }
    });

    return;
  }

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

// SOCKET IO CODE YAHA HAI
// const logger = require("../utils/logger");
// const { getBusyLoggedInDrivers } = require("../models/driverModel");

// const loggedInDrivers = new Map();

// function handleDriverLoginSocket(socket, io) {
//   socket.join("dashboard");

//   socket.emit("DRIVER_LIST", Array.from(loggedInDrivers.values()));

//   socket.on("disconnect", () => {
//     logger.info("dashboard disconnected", socket.id);
//   });
// }

// async function handleBusyDriverSocket(socket, io) {
//   socket.join("busy-dashboard");

//   const drivers = await getBusyLoggedInDrivers();

//   socket.emit("BUSY_DRIVER_LIST", drivers);
// }

// function notifyDriverLogin(driver, io) {
//   loggedInDrivers.set(driver.id, driver);

//   io.to("dashboard").emit("DRIVER_LOGIN", driver);
// }

// function notifyDriverLogout(driverId, io) {
//   loggedInDrivers.delete(driverId);

//   io.to("dashboard").emit("DRIVER_LOGOUT", { driverId });
// }

// function notifyBusyDriverUpdate(driver, io) {
//   io.to("busy-dashboard").emit("BUSY_DRIVER_UPDATE", driver);
// }

// module.exports = {
//   handleDriverLoginSocket,
//   handleBusyDriverSocket,
//   notifyDriverLogin,
//   notifyDriverLogout,
//   notifyBusyDriverUpdate,
// };
