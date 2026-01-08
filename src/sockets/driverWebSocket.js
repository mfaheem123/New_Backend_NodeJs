const WebSocket = require("ws");
const logger = require("../utils/logger");

const clients = new Set();

function handleDriverLoginSocket(ws) {
  clients.add(ws);

  ws.on("message", (data) => {
    logger.info("ws:message", {
      id: ws.id,
      message: data.toString(),
    });
  });

  ws.on("close", () => {
    clients.delete(ws);

    logger.info("ws:disconnect", {
      id: ws.id,
    });
  });

  ws.on("error", (err) => {
    logger.error("ws:error", {
      id: ws.id,
      error: err.message,
    });
  });
}

function broadcastDriverLogin(driver) {
  const payload = JSON.stringify({
    event: "DRIVER_LOGIN",
    data: driver,
  });

  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);

      logger.info("ws:emit", {
        to: "driver-login",
        socketId: client.id,
        event: "DRIVER_LOGIN",
      });
    }
  });
}

module.exports = {
  handleDriverLoginSocket,
  broadcastDriverLogin,
};
