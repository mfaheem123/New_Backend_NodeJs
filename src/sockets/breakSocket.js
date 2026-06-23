const WebSocket = require("ws");
const logger = require("../utils/logger");

// Driver Clients Store
const breakDriverClients = new Map();

function handleBreakDriverSocket(ws, req) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const driverId = url.searchParams.get("driverId");

  if (!driverId) {
    ws.close();
    return;0
  }

  // Save Driver Socket
  breakDriverClients.set(driverId, ws);

  logger.info("ws:panic-driver-connected", {
    driverId,
  });

  ws.on("close", () => {
    breakDriverClients.delete(driverId);

    logger.info("ws:break-driver-disconnected", {
      driverId,
    });
  });

  ws.on("error", (err) => {
    logger.error("ws:break-driver-error", {
      error: err.message,
    });
  });
}

module.exports = {
  handleBreakDriverSocket,
  breakDriverClients,
};
