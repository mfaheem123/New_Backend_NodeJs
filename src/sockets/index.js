const WebSocket = require("ws");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

const {
  handleDriverLoginSocket,
  handleBusyDriverSocket,
} = require("./driverWebSocket");
const { handleCLISocket } = require("./cliWebSocket");

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
    } else if (url.startsWith("/websocket/driver-busy")) {
      // 🔥 NEW URL
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.id = uuidv4();
        handleBusyDriverSocket(ws, req);
      });
    } else if (url.startsWith("/websocket/cli")) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        ws.id = uuidv4();
        handleCLISocket(ws, req);
      });
    } else {
      logger.warn("ws:rejected", { url });
      socket.destroy();
    }
  });
}

module.exports = initWebSockets;




// SOCKET IO CODE YAHA HAI
// const logger = require("../utils/logger");
// const driverSockets = require("./driverSocket");
// const cliSockets = require("./cliSocket");

// function initSockets(io) {
//   io.on("connection", (socket) => {
//     logger.info("socket:connected", { id: socket.id });

//     const { type } = socket.handshake.query;

//     if (type === "driver-login") {
//       driverSockets.handleDriverLoginSocket(socket, io);
//     }

//     if (type === "driver-busy") {
//       driverSockets.handleBusyDriverSocket(socket, io);
//     }

//     if (type === "cli") {
//       cliSockets.handleCLISocket(socket, io);
//     }

//     socket.on("disconnect", () => {
//       logger.info("socket:disconnected", { id: socket.id });
//     });
//   });
// }

// module.exports = initSockets;