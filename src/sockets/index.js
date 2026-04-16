// const WebSocket = require("ws");
// const logger = require("../utils/logger");
// const { v4: uuidv4 } = require("uuid");

// const {
//   handleDriverLoginSocket,
//   handleBusyDriverSocket,
// } = require("./driverWebSocket");
// const { handleCLISocket } = require("./cliWebSocket");
// const { handleBookingStatusSocket } = require("./bookingStatusSocket");

// function initWebSockets(server) {
//   const wss = new WebSocket.Server({ noServer: true });

//   server.on("upgrade", (req, socket, head) => {
//     const { url } = req;

//     logger.info("ws:upgrade", { url });

//     if (url.startsWith("/websocket/driver-login")) {
//       wss.handleUpgrade(req, socket, head, (ws) => {
//         ws.id = uuidv4();
//         handleDriverLoginSocket(ws, req);
//       });
//     } else if (url.startsWith("/websocket/driver-busy")) {
//       // 🔥 NEW URL
//       wss.handleUpgrade(req, socket, head, (ws) => {
//         ws.id = uuidv4();
//         handleBusyDriverSocket(ws, req);
//       });
//     } else if (url.startsWith("/websocket/cli")) {
//       wss.handleUpgrade(req, socket, head, (ws) => {
//         ws.id = uuidv4();
//         handleCLISocket(ws, req);
//       });
//     } else if (url.startsWith("/websocket/booking-status")) {
//     wss.handleUpgrade(req, socket, head, (ws) => {
//       ws.id = uuidv4();
//       handleBookingStatusSocket(ws, req);
//     });
//   }
//     else {
//       logger.warn("ws:rejected", { url });
//       socket.destroy();
//     }
//   });
// }

// module.exports = initWebSockets;

const WebSocket = require("ws");
const logger = require("../utils/logger");
const { v4: uuidv4 } = require("uuid");

const {
  handleDriverLoginSocket,
  handleBusyDriverSocket,
} = require("./driverWebSocket");
const { handleCLISocket } = require("./cliWebSocket");
const { handleBookingStatusSocket } = require("./bookingStatusSocket");
const {
  handleDriverTrackingSocket,
  handleTrackingDashboardSocket,
} = require("./driverTrackingSocket");

function initWebSockets(server) {
  const wss = new WebSocket.Server({ noServer: true });

  // HEARTBEAT
  function heartbeat() {
    this.isAlive = true;
  }

  wss.on("connection", (ws) => {
    ws.isAlive = true;

    ws.on("pong", heartbeat);

    ws.on("error", (err) => {
      logger.error("ws:error", err);
    });

    ws.on("close", () => {
      logger.info("ws:closed", { id: ws.id });
    });
  });

  // Ping every 30s
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        logger.warn("ws:terminate-dead", { id: ws.id });
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(interval);
  });

  server.on("upgrade", (req, socket, head) => {
    const { url } = req;

    logger.info("ws:upgrade", { url });

    const routeHandler = (ws) => {
      ws.id = uuidv4();

      wss.emit("connection", ws, req);

      if (url.startsWith("/websocket/driver-login")) {
        handleDriverLoginSocket(ws, req);
      } else if (url.startsWith("/websocket/driver-busy")) {
        handleBusyDriverSocket(ws, req);
      } else if (url.startsWith("/websocket/cli")) {
        handleCLISocket(ws, req);
      } else if (url.startsWith("/websocket/booking-status")) {
        handleBookingStatusSocket(ws, req);
      }
      else if (url.startsWith("/websocket/driver-tracking")) {
  handleDriverTrackingSocket(ws, req);
} else if (url.startsWith("/websocket/driver-tracking-dashboard")) {
  handleTrackingDashboardSocket(ws, req);
}
      else {
        logger.warn("ws:rejected", { url });
        ws.close();
      }
    };

    wss.handleUpgrade(req, socket, head, routeHandler);
  });
}

module.exports = initWebSockets;

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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
