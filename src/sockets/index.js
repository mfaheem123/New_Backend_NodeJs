const WebSocket = require("ws");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

const { handleDriverLoginSocket } = require("./driverWebSocket");

function initWebSockets(server) {
  const wss = new WebSocket.Server({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const { url } = req;

    logger.info("ws:upgrade", { url });

    if (url === "/websocket/driver-login") {
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.id = uuidv4(); // socket.id equivalent

        logger.info("ws:connected", {
          id: ws.id,
          path: url,
        });

        handleDriverLoginSocket(ws, req);
      });
    } else {
      logger.warn("ws:rejected", { url });
      socket.destroy();
    }
  });
}

module.exports = initWebSockets;
