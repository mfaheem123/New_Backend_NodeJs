const WebSocket = require("ws");
const logger = require("../utils/logger");

// extension => Set of sockets
const cliClientsByExtension = new Map();

/**
 * Handle CLI socket connection
 * One socket = one agent (extension)
 */
function handleCLISocket(ws, req) {
  const params = new URLSearchParams(req.url.split("?")[1]);
  const extension = params.get("extension");

  if (!extension) {
    ws.close(1008, "Extension required");
    return;
  }

  ws.extension = extension;

  if (!cliClientsByExtension.has(extension)) {
    cliClientsByExtension.set(extension, new Set());
  }

  cliClientsByExtension.get(extension).add(ws);

  logger.info("ws:cli-connected", {
    socketId: ws.id,
    extension,
  });

  ws.on("close", () => {
    cliClientsByExtension.get(extension)?.delete(ws);

    logger.info("ws:cli-disconnected", {
      socketId: ws.id,
      extension,
    });
  });

  ws.on("error", (err) => {
    logger.error("ws:cli-error", {
      socketId: ws.id,
      error: err.message,
    });
  });
}

/**
 * Notify CLI to open for specific extension
 */
function notifyCLIOpen(extension, payload) {
  const clients = cliClientsByExtension.get(extension);

  if (!clients) return;

  const message = JSON.stringify({
    event: "CLI_OPEN",
    data: payload,
  });

  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });

  logger.info("ws:cli-open-sent", {
    extension,
  });
}

module.exports = {
  handleCLISocket,
  notifyCLIOpen,
};


// SOCKET IO CODE YAHA HAI
// const logger = require("../utils/logger");

// const cliClients = new Map();

// function handleCLISocket(socket) {
//   const { extension } = socket.handshake.query;

//   if (!extension) {
//     socket.disconnect();
//     return;
//   }

//   socket.join(`cli-${extension}`);

//   logger.info("cli connected", {
//     socketId: socket.id,
//     extension,
//   });
// }

// function notifyCLIOpen(io, extension, payload) {
//   io.to(`cli-${extension}`).emit("CLI_OPEN", payload);
// }

// module.exports = {
//   handleCLISocket,
//   notifyCLIOpen,
// };