const { Pool } = require("pg");
const logger = require("../utils/logger");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err) => logger.error("Postgres pool error", err));
// jab pool ek connection establish kare
pool
  .connect()
  .then((client) => {
    console.log("✅ Database connected successfully!");
    client.release(); // connection wapas pool me release kar dena
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err.message);
  });

module.exports = {
  query: async (text, params) => {
    const start = Date.now();
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.info("db-query", { text, duration, rows: res.rowCount });

    return res;
  },
  pool,
};
