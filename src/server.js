require("dotenv").config();
const http = require("http");
const app = require("./app");
const client = require("prom-client");
const initWebSocket = require("./sockets");

// const { Server } = require("socket.io");
// const { initIO } = require("./sockets/io");
// const initSockets = require("./sockets");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// PURE WebSocket attach
initWebSocket(server); // IS KO DISBALE KRNA HAI

// SOCKET.IO INIT
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//   },
// });

// initIO(io);
// initSockets(io);

// Prometheus (same as before)
const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
});

client.collectDefaultMetrics();

app.use((req, res, next) => {
  const end = httpRequestDurationMs.startTimer();
  res.on("finish", () => {
    const route = req.route?.path || req.path || "unknown";
    end({ method: req.method, route, status_code: res.statusCode });
  });
  next();
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

// 🚀 START SERVER
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ HTTP running on http://192.168.110.5:${PORT}`);
  console.log(`🔌 WebSocket running on ws://192.168.110.5:${PORT}`);
});
