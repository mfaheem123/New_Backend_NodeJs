const pool = require("../db");

async function getTemplateById(id) {
  const { rows } = await pool.query(
    "SELECT * FROM templates WHERE id = $1",
    [id]
  );

  return rows[0];
}

module.exports = { getTemplateById };