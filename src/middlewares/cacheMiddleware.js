const redis = require('../config/redis');

/**
 * Custom Auto-Caching Middleware
 * @param {number} ttlInSeconds - Cache duration in seconds (default: 300s / 5 mins)
 */
const autoCache = (ttlInSeconds = 300) => {
  return async (req, res, next) => {
    // Sirf GET requests ko cache karen
    if (req.method !== 'GET') {
      return next();
    }

    // Unique Cache Key: URL + Query Params
    const cacheKey = `cache:${req.originalUrl || req.url}`;

    try {
      // 1. Check if data exists in Redis
      const cachedData = await redis.get(cacheKey);

      if (cachedData) {
        console.log(`⚡ [CACHE HIT]: ${cacheKey}`);
        return res.json(JSON.parse(cachedData));
      }

      console.log(`🐢 [CACHE MISS]: ${cacheKey}`);

      // 2. Intercept `res.json` method to capture response body
      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Sirf Successful Responses (200 OK) ko cache karen
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redis.set(cacheKey, JSON.stringify(body), 'EX', ttlInSeconds)
            .catch(err => console.error('Redis Set Error:', err));
        }

        // Client ko actual response send karen
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error('Cache Middleware Error:', error);
      // Fail-safe: Agar Redis me issue aaye to API normal database se chale
      next();
    }
  };
};

module.exports = autoCache;