const db = require("../db");

const TemplateModel = {
  getAllTemplateTypes: async (company_id) => {
    const { rows } = await db.query(
      `SELECT id, name FROM template_types WHERE company_id = $1 ORDER BY id ASC`,
      [company_id],
    );
    return rows;
  },

  getTemplatesByTypeId: async (templateTypeId, company_id) => {
    const { rows } = await db.query(
      `SELECT id, name 
       FROM templates 
       WHERE template_type_id = $1 AND company_id = $2
       ORDER BY id ASC`,
      [templateTypeId, company_id],
    );
    return rows;
  },

  getTemplateById: async (id) => {
    const { rows } = await db.query(
      `SELECT 
        t.id,
        t.template_type_id,
        t.name,
        t.subject,
        t.content,
        t.body,
        tt.id as template_type_id,
        tt.name as template_type_name
       FROM templates t
       JOIN template_types tt ON t.template_type_id = tt.id
       WHERE t.id = $1`,
      [id],
    );
    return rows[0];
  },

  getAllTemplates: async () => {
    const { rows } = await db.query(
      `SELECT 
        t.id,
        t.name,
        t.subject,
        t.template_type_id,
        tt.name as template_type_name
       FROM templates t
       JOIN template_types tt ON t.template_type_id = tt.id
       ORDER BY t.id ASC`,
    );
    return rows;
  },

  createTemplate: async (templateData) => {
    const { template_type_id, name, subject, content, body, company_id } =
      templateData;
    const { rows } = await db.query(
      `INSERT INTO templates 
        (template_type_id, name, subject, content, body, company_id) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [template_type_id, name, subject, content, body, company_id],
    );
    return rows[0];
  },

  updateTemplate: async (id, templateData) => {
    const { template_type_id, name, subject, content, body } = templateData;
    const { rows } = await db.query(
      `UPDATE templates 
       SET template_type_id = $1,
           name = $2,
           subject = $3,
           content = $4,
           body = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [template_type_id, name, subject, content, body, id],
    );
    return rows[0];
  },

  deleteTemplate: async (id) => {
    const { rows } = await db.query(
      `DELETE FROM templates WHERE id = $1 RETURNING id`,
      [id],
    );
    return rows[0];
  },
};

module.exports = TemplateModel;
