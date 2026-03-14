// sockets/bookingStatusSocket.js
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

let connectedClients = []; // all clients connected to this socket

function handleBookingStatusSocket(ws, req) {
  ws.id = uuidv4();
  connectedClients.push(ws);
  logger.info(`BookingStatus WS connected: ${ws.id}`);

  ws.on("close", () => {
    connectedClients = connectedClients.filter((c) => c.id !== ws.id);
    logger.info(`BookingStatus WS disconnected: ${ws.id}`);
  });

  // optional: listen for messages from clients
  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      logger.info("Received from client:", data);
    } catch (err) {
      logger.error("Invalid WS message", err);
    }
  });
}

// 🔹 Notify all clients when booking is updated
function notifyBookingStatus(bookingId) {
  connectedClients.forEach((client) => {
    if (client.readyState === 1) {
      // 1 = OPEN
      client.send(JSON.stringify({ bookingId, status: true }));
    }
  });
}

module.exports = {
  handleBookingStatusSocket,
  notifyBookingStatus,
};
