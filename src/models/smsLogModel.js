const pool = require("../db");

async function createSMSLog(data) {
  const { template_id, mobile, message, status, gateway_response } = data;

  await pool.query(
    `INSERT INTO sms_logs 
    (template_id, mobile, message, status, gateway_response) 
    VALUES ($1, $2, $3, $4, $5)`,
    [template_id, mobile, message, status, gateway_response],
  );
}

module.exports = { createSMSLog };
