const WebSocket = require("ws");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

const { handleDriverLoginSocket } = require("./driverWebSocket");
const { handleCLISocket } = require("./cliWebSocket"); // 👈 NEW

function initWebSockets(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { url } = req;

    logger.info("ws:upgrade", { url });

    if (url.startsWith("/websocket/driver-login")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.id = uuidv4();
        handleDriverLoginSocket(ws, req);
      });
    }

    else if (url.startsWith("/websocket/cli")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.id = uuidv4();
        handleCLISocket(ws, req);
      });
    }

    else {
      logger.warn("ws:rejected", { url });
      socket.destroy();
    }
  });
}

module.exports = initWebSockets;
