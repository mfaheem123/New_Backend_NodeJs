const WebSocket = require("ws");
const logger = require("../utils/logger");

// Driver Clients Store
const panicDriverClients = new Map();

function handlePanicDriverSocket(ws, req) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  const driverId = url.searchParams.get("driverId");

  if (!driverId) {
    ws.close();
    return;
  }

  // Save Driver Socket
  panicDriverClients.set(driverId, ws);

  logger.info("ws:panic-driver-connected", {
    driverId,
  });

  ws.on("close", () => {
    panicDriverClients.delete(driverId);

    logger.info("ws:panic-driver-disconnected", {
      driverId,
    });
  });

  ws.on("error", (err) => {
    logger.error("ws:panic-driver-error", {
      error: err.message,
    });
  });
}

module.exports = {
  handlePanicDriverSocket,
  panicDriverClients,
};
