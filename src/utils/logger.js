const fs = require("fs");
const winston = require("winston");
require("winston-daily-rotate-file");

// Ensure logs folder exists
if (!fs.existsSync("logs")) fs.mkdirSync("logs");

// Info-level logs
const infoTransport = new winston.transports.DailyRotateFile({
  filename: "logs/app-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "20m",
  maxFiles: "14d",
});

// Error-level logs
const errorTransport = new winston.transports.DailyRotateFile({
  filename: "logs/error-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  level: "error",
  maxSize: "20m",
  maxFiles: "14d",
});

// Create Winston logger
const logger = winston.createLogger({
  level: "info", // Default level
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    infoTransport,
    errorTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: "logs/exceptions.log" }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: "logs/rejections.log" }),
  ],
});

// For morgan integration
// Separate Morgan streams for info and error levels
logger.stream = {
  write: (message) => {
    const msg = message.trim();

    // Extract status code from message (Morgan includes it)
    const statusCodeMatch = msg.match(/" (\d{3}) /);
    const statusCode = statusCodeMatch ? parseInt(statusCodeMatch[1], 10) : 200;

    if (statusCode >= 400) {
      logger.error(msg);
    } else {
      logger.info(msg);
    }
  },
};

module.exports = logger;
