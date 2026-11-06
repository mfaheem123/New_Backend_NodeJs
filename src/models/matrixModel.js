// models/matrixModel.js
const pool = require("../db");

class MatrixModel {
  static async getZoneAvailabilityMatrix(company_id) {
    const query = `
        SELECT 
            z.id AS zone_id,
            z.name AS zone_name,
            z.secondary_name,
            
            -- 1. Available Drivers Count
            COALESCE(d.driver_count, 0) AS available_drivers,

            -- 2. J0 Jobs
            COALESCE(j.j0_jobs, 0) AS j0_count,

            -- 3. J15 Jobs
            COALESCE(j.j15_jobs, 0) AS j15_count,

            -- 4. J30 Jobs
            COALESCE(j.j30_jobs, 0) AS j30_count

        FROM zones z 
        
        -- Drivers Subquery: Matches driver's zone string with zone name OR zone id for this company
        LEFT JOIN (
            SELECT 
                zone, 
                COUNT(*) AS driver_count
            FROM drivers
            WHERE active = true 
              AND UPPER(driver_status) = 'AVAILABLE'
              AND company_id = $1
              AND zone IS NOT NULL
            GROUP BY zone
        ) d ON UPPER(TRIM(z.name)) = UPPER(TRIM(d.zone)) 
            OR CAST(z.id AS VARCHAR) = TRIM(d.zone)

        -- Jobs Subquery: Strict filtering for bookings based on company_id and matching pickup_plot with zone id
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
              AND pickup_plot IS NOT NULL
            GROUP BY pickup_plot
        ) j ON z.id = j.zone_id

        WHERE z.company_id = $1;
    `;

    const { rows } = await pool.query(query, [company_id]);
    return rows;
  }
}

module.exports = MatrixModel;