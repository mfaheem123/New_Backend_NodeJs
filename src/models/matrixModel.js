// models/matrixModel.js
const pool = require("../db");

class MatrixModel {
  // ---------------------------------------------------------
  // FETCH ZONE AVAILABILITY MATRIX BY COMPANY ID
  // ---------------------------------------------------------
  static async getZoneAvailabilityMatrix(company_id) {
    const query = `
        SELECT 
            z.id AS zone_id,
            z.name AS zone_name,
            z.secondary_name,
            
            -- 1. Available Drivers Count for this Company & Zone
            COALESCE(d.driver_count, 0) AS available_drivers,

            -- 2. J0 Jobs (Immediate / Active bookings)
            COALESCE(j.j0_jobs, 0) AS j0_count,

            -- 3. J15 Jobs (Next 15 minutes window)
            COALESCE(j.j15_jobs, 0) AS j15_count,

            -- 4. J30 Jobs (Between 15 and 30 minutes window)
            COALESCE(j.j30_jobs, 0) AS j30_count

        FROM zones z 
        
        -- Drivers Subquery: Count active & available drivers matching company_id and zone name
        LEFT JOIN (
            SELECT 
                zone, 
                COUNT(*) AS driver_count
            FROM drivers
            WHERE active = true 
              AND driver_status = 'Available'
              AND company_id = $1
            GROUP BY zone
        ) d ON z.name = d.zone

        -- Jobs Subquery: Count unassigned bookings linked via pickup_plot and company_id
        LEFT JOIN (
            SELECT 
                pickup_plot AS zone_id,
                
                COUNT(CASE 
                    WHEN (pickup_date || ' ' || COALESCE(pickup_time, '00:00:00'))::timestamp <= NOW() 
                         AND driver_id IS NULL 
                    THEN 1 
                END) AS j0_jobs,

                COUNT(CASE 
                    WHEN (pickup_date || ' ' || COALESCE(pickup_time, '00:00:00'))::timestamp > NOW() 
                         AND (pickup_date || ' ' || COALESCE(pickup_time, '00:00:00'))::timestamp <= NOW() + INTERVAL '15 minutes' 
                         AND driver_id IS NULL 
                    THEN 1 
                END) AS j15_jobs,

                COUNT(CASE 
                    WHEN (pickup_date || ' ' || COALESCE(pickup_time, '00:00:00'))::timestamp > NOW() + INTERVAL '15 minutes' 
                         AND (pickup_date || ' ' || COALESCE(pickup_time, '00:00:00'))::timestamp <= NOW() + INTERVAL '30 minutes' 
                         AND driver_id IS NULL 
                    THEN 1 
                END) AS j30_jobs

            FROM bookings
            WHERE trash = false 
              AND hidden = false 
              AND completed = false
              AND driver_id IS NULL
              AND company_id = $1
            GROUP BY pickup_plot
        ) j ON z.id = j.zone_id

        -- WHERE clause sabse akhir mein aayega
        WHERE z.company_id = $1;
    `;

    const { rows } = await pool.query(query, [company_id]);
    return rows;
  }
}

module.exports = MatrixModel;
