const WebSocket = require("ws");
const logger = require("../utils/logger");


// companyId => extension => Set<WebSocket>
const cliClients = new Map();

/**
 * Handle CLI socket connection
 * One socket = one agent (extension)
 */
function handleCLISocket(ws, req) {
  const params = new URLSearchParams(req.url.split("?")[1]);
 const companyId = params.get("companyId");

  const extension = params.get("extension");

    if (!companyId || !extension) {
    ws.close(1008, "companyId and extension required");
    return;
  }

   ws.companyId = companyId;
  ws.extension = extension;

  if (!cliClients.has(companyId)) {
  cliClients.set(companyId, new Map());
}

const companyExtensions = cliClients.get(companyId);

if (!companyExtensions.has(extension)) {
  companyExtensions.set(extension, new Set());
}

companyExtensions.get(extension).add(ws);

  logger.info("ws:cli-connected", {
    socketId: ws.id,
    extension,
    companyId
  });

  ws.on("close", () => {
const companyExtensions = cliClients.get(companyId);

companyExtensions?.get(extension)?.delete(ws);

if (
  companyExtensions?.get(extension)?.size === 0
) {
  companyExtensions.delete(extension);
}

if (companyExtensions?.size === 0) {
  cliClients.delete(companyId);
}
    logger.info("ws:cli-disconnected", {
      socketId: ws.id,
      extension,
      companyId
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
function notifyCLIOpen(companyId, extension, payload) {
  const companyExtensions = cliClients.get(
        String(companyId)
    );

    if (!companyExtensions) return;
  const clients = companyExtensions.get(
        String(extension)
    );

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
    companyId,
    extension,
  });
}

module.exports = {
  handleCLISocket,
  notifyCLIOpen,
};
