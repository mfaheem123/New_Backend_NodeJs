const rateLimit = require("express-rate-limit");

const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,

  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => {
    const path = req.path;

    // Sirf getbytabs ki numeric IDs exclude hain
    if (/^\/api\/bookings\/getbytabs\/\d+\/?$/.test(path)) {
      console.log("RATE LIMIT SKIPPED:", req.originalUrl);
      return true;
    }

    // Sirf booking-count exclude hai
    if (/^\/api\/enumerations\/booking-count\/?$/.test(path)) {
      console.log("RATE LIMIT SKIPPED:", req.originalUrl);
      return true;
    }

    console.log("RATE LIMIT CHECKED:", req.originalUrl);
    return false;
  },

  handler: (req, res) => {
    console.log("RATE LIMIT EXCEEDED:", req.ip, req.originalUrl);

    res.status(429).json({
      status: false,
      message: "Too many requests. Please try again later.",
    });
  },
});

module.exports = { globalRateLimiter };
