const db = require("../db");

class SinbinModel {
  // Add or Update Driver Sinbin Status
  static async updateDriverSinbin(
    companyId,
    { driver_id, message, sinbin_time },
  ) {
    const isActive = parseInt(sinbin_time) > 0;

    const query = `
            INSERT INTO driver_sinbins (company_id, driver_id, message, sinbin_time, is_active, updated_at)
            VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
            ON CONFLICT (company_id, driver_id) -- (Ensure composite unique constraint if needed or query based)
            DO UPDATE SET 
                message = EXCLUDED.message,
                sinbin_time = EXCLUDED.sinbin_time,
                is_active = EXCLUDED.is_active,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *;
        `;
    // Note: Simple INSERT strategy if logs are maintained
    const simpleInsertQuery = `
            INSERT INTO driver_sinbins (company_id, driver_id, message, sinbin_time, is_active)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

    const { rows } = await db.query(simpleInsertQuery, [
      companyId,
      driver_id,
      message,
      sinbin_time,
      isActive,
    ]);
    return rows[0];
  }

  // Fetch Active Sinbin Drivers with Vehicle & Type nested details
  static async getActiveSinbinDrivers(companyId) {
    const query = `
            SELECT 
                d.id,
                d.username,
                d.first_name,
                d.last_name,
                d.mobile,
                v.vehicle_number,
                v.make,
                v.model,
                v.color,
                vt.id AS vt_id,
                vt.name AS vt_name,
                vt.passengers AS vt_passengers,
                vt.luggages AS vt_luggages
            FROM driver_sinbins sb
            INNER JOIN drivers d ON sb.driver_id = d.id
            LEFT JOIN vehicles v ON d.id = v.driver_id
            LEFT JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
            WHERE sb.company_id = $1 AND sb.sinbin_time > 0 AND sb.is_active = TRUE;
        `;

    const { rows } = await db.query(query, [companyId]);

    // Format to match exact response JSON structure
    return rows.map((row) => ({
      id: row.id,
      username: row.username,
      first_name: row.first_name,
      last_name: row.last_name,
      mobile: row.mobile,
      vehicle: {
        vehicle_number: row.vehicle_number || null,
        make: row.make || null,
        model: row.model || null,
        color: row.color || null,
        vehicle_type: row.vt_id
          ? {
              id: row.vt_id,
              name: row.vt_name,
              passengers: row.vt_passengers,
              luggages: row.vt_luggages,
            }
          : null,
      },
    }));
  }
}

module.exports = SinbinModel;
