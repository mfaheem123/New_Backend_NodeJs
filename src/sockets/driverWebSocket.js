const WebSocket = require("ws");
const logger = require("../utils/logger");

// Sirf dashboard sockets
const dashboardClients = new Set();

// Logged-in drivers list (memory)
const loggedInDrivers = new Map();

//Driver Login Socket
function handleDriverLoginSocket(ws) {
  dashboardClients.add(ws);

  logger.info("ws:dashboard-connected", {
    socketId: ws.id,
  });

  // 🔁 Jab dashboard connect ho to current state bhejo
  ws.send(
    JSON.stringify({
      event: "DRIVER_LIST",
      data: Array.from(loggedInDrivers.values()),
    })
  );

  ws.on("close", () => {
    dashboardClients.delete(ws);

    logger.info("ws:dashboard-disconnect", {
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

// Driver Login Notify At Web
function notifyDriverLogin(driver) {
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

  logger.info("ws:driver-login", {
    driverId: driver.id,
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

module.exports = {
  handleDriverLoginSocket,
  notifyDriverLogin,
  notifyDriverLogout,
};
