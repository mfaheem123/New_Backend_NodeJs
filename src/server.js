require("dotenv").config();
const http = require("http");
const socketio = require("socket.io");
const app = require("./app");
const initSockets = require("./sockets");
const client = require("prom-client");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
const io = socketio(server, { cors: { origin: "*" } });

// sockets
initSockets(io);

// 1️⃣ Create a Histogram metric for request duration
const httpRequestDurationMs = new client.Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in ms",
  labelNames: ["method", "route", "status_code"],
  buckets: [50, 100, 200, 300, 400, 500, 1000, 2000, 5000],
});

// prometheus metrics
client.collectDefaultMetrics();

// 3️⃣ Middleware to measure HTTP request duration
app.use((req, res, next) => {
  const end = httpRequestDurationMs.startTimer();
  res.on("finish", () => {
    const route = req.route?.path || req.path || "unknown";
    end({ method: req.method, route, status_code: res.statusCode });
  });
  next();
});

app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
});

// Server Listening on Local Server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
