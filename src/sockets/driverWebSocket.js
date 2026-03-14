const WebSocket = require("ws");
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

  // 1️⃣ Current state bhej do
  ws.send(
    JSON.stringify({
      event: "DRIVER_LIST",
      data: availableDrivers,
    }),
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

  try {
    const drivers = await getBusyLoggedInDrivers();

    ws.send(
      JSON.stringify({
        event: "BUSY_DRIVER_LIST",
        data: drivers,
      }),
    );
  } catch (error) {
    logger.error("ws:busy-driver-list-error", {
      error: error.message,
    });
  }

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
    vehicle_type: driver.vehicle?.vehicle_type?.name || null,
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

// function notifyBusyDriverUpdate(driver) {
//   if (driver.session_status !== "logged_in") return;

//   if (
//     driver.booking_status === "Available" &&
//     driver.driver_status === "Available"
//   ) {
//     return;
//   }

//   const payload = JSON.stringify({
//     event: "BUSY_DRIVER_UPDATE",
//     data: driver,
//   });

//   busyDashboardClients.forEach((client) => {
//     if (client.readyState === WebSocket.OPEN) {
//       client.send(payload);
//     }
//   });
// }

function notifyBusyDriverUpdate(driver) {
  console.log("BUSY CLIENTS:", busyDashboardClients.size);
  if (driver.session_status !== "logged_in") return;

  // Agar driver available ho gaya to login dashboard pe bhejo
  if (
    driver.booking_status === "Available" &&
    driver.driver_status === "Available"
  ) {
    loggedInDrivers.set(driver.id, driver);

    const payload = JSON.stringify({
      event: "DRIVER_LOGIN",
      data: driver,
    });

    dashboardClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });

    return;
  }

  // Warna busy dashboard ko bhejo
  const payload = JSON.stringify({
    event: "BUSY_DRIVER_UPDATE",
    data: driver,
  });

  busyDashboardClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

module.exports = {
  handleDriverLoginSocket,
  notifyDriverLogin,
  notifyDriverLogout,
  notifyBusyDriverUpdate,
  handleBusyDriverSocket,
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
