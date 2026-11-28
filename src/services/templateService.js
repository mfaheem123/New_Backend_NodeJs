const pool = require("../db");

// ---------------------------------------------------------
// GET TEMPLATE BY ID
// ---------------------------------------------------------
async function getTemplateById(id) {
  const { rows } = await pool.query("SELECT * FROM templates WHERE id = $1", [
    id,
  ]);

  return rows[0];
}

// ---------------------------------------------------------
// GET TEMPLATE BY COMPANY ID AND NAME
// ---------------------------------------------------------
async function getCompanyTemplateByName(companyId, templateName) {
  if (!templateName) return null;

  // 1. Pehle current company ka template dhoondein
  if (companyId) {
    const res = await pool.query(
      `SELECT * FROM public.templates 
       WHERE company_id = $1 AND LOWER(name) = LOWER($2) 
       ORDER BY id ASC LIMIT 1`,
      [companyId, templateName],
    );
    if (res.rows && res.rows.length > 0) {
      return res.rows[0];
    }
  }

  // 2. Fallback: Agar company ka apna template nahi mila to default (company_id = 1) se lein
  const fallbackRes = await pool.query(
    `SELECT * FROM public.templates 
     WHERE company_id = 3 AND LOWER(name) = LOWER($1) 
     ORDER BY id ASC LIMIT 1`,
    [templateName],
  );

  return fallbackRes.rows?.[0] || null;
}

module.exports = {
  getTemplateById,
  getCompanyTemplateByName,
};
