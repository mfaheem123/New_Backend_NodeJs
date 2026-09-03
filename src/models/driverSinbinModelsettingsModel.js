const db = require("../db");

class SettingsModel {
  // Get settings by company_id
  static async getByCompanyId(companyId) {
    const query = `
            SELECT id, recoverjob, rejectjob, ignorejob 
            FROM driver_sinbin_settings 
            WHERE company_id = $1;
        `;
    const { rows } = await db.query(query, [companyId]);
    return rows[0] || null;
  }

  // Upsert (Insert or Update if exists) settings
  static async upsertSettings(companyId, { recoverJob, rejectJob, ignoreJob }) {
    const query = `
        INSERT INTO driver_sinbin_settings (company_id, recoverjob, rejectjob, ignorejob, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        ON CONFLICT (company_id) 
        DO UPDATE SET 
            recoverjob = EXCLUDED.recoverjob,
            rejectjob = EXCLUDED.rejectjob,
            ignorejob = EXCLUDED.ignorejob,
            updated_at = CURRENT_TIMESTAMP
        RETURNING id, recoverjob, rejectjob, ignorejob;
    `;

    const { rows } = await db.query(query, [
      parseInt(companyId),
      parseInt(recoverJob) || 0,
      parseInt(rejectJob) || 0,
      parseInt(ignoreJob) || 0,
    ]);

    return rows[0];
  }
}

module.exports = SettingsModel;
