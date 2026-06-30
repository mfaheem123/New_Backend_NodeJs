const logger = require("../utils/logger");

// driver_id => ws
const driverFeatureClients = new Map();

function handleDriverAppFeaturesSocket(ws, req) {
  const params = new URLSearchParams(req.url.split("?")[1]);

  const driverId = params.get("driver_id");

  if (!driverId) {
    ws.close(1008, "driver_id required");
    return;
  }

  driverFeatureClients.set(driverId, ws);

  logger.info("ws:driver-feature-connected", {
    socketId: ws.id,
    driverId,
  });

  ws.on("close", () => {
    driverFeatureClients.delete(driverId);

    logger.info("ws:driver-feature-disconnected", {
      socketId: ws.id,
      driverId,
    });
  });
}

// emit realtime update
function emitDriverFeatureUpdate(driverId, features) {
  const client = driverFeatureClients.get(String(driverId));

  if (!client || client.readyState !== 1) {
    logger.warn("ws:driver-feature-not-connected", {
      driverId,
    });
    return;
  }

  client.send(
    JSON.stringify({
      event: "driver_app_features_updated",
      data: features,
    }),
  );

  logger.info("ws:driver-feature-sent", {
    driverId,
  });
}

module.exports = {
  handleDriverAppFeaturesSocket,
  emitDriverFeatureUpdate,
};
