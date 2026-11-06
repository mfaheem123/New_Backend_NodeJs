
// models/matrixModel.js

const pool = require("../db");

class MatrixModel {
  static async getZoneAvailabilityMatrix(company_id) {
    const query = `
      WITH zone_vertices AS (
        SELECT
          z.id AS zone_id,
          (v.vertex->>'latitude')::DOUBLE PRECISION AS lat,
          (v.vertex->>'longitude')::DOUBLE PRECISION AS lng,
          v.ordinality AS vertex_order
        FROM zones z
        CROSS JOIN LATERAL jsonb_array_elements(
          COALESCE(z.vertices, '[]'::jsonb)
        ) WITH ORDINALITY AS v(vertex, ordinality)
        WHERE z.company_id = $1
      ),

      zone_edges AS (
        SELECT
          zone_id,

          lat AS lat1,
          lng AS lng1,

          LEAD(lat) OVER (
            PARTITION BY zone_id
            ORDER BY vertex_order
          ) AS lat2,

          LEAD(lng) OVER (
            PARTITION BY zone_id
            ORDER BY vertex_order
          ) AS lng2,

          FIRST_VALUE(lat) OVER (
            PARTITION BY zone_id
            ORDER BY vertex_order
          ) AS first_lat,

          FIRST_VALUE(lng) OVER (
            PARTITION BY zone_id
            ORDER BY vertex_order
          ) AS first_lng

        FROM zone_vertices
      ),

      zone_drivers AS (
        SELECT
          z.id AS zone_id,
          COUNT(DISTINCT dr.id)::INTEGER AS driver_count

        FROM zones z

        LEFT JOIN drivers dr
          ON dr.company_id = $1
          AND dr.active = true
          AND UPPER(TRIM(dr.driver_status)) = 'AVAILABLE'
          AND dr.latitude IS NOT NULL
          AND dr.longitude IS NOT NULL

          AND EXISTS (
            SELECT 1
            FROM zone_edges e

            WHERE e.zone_id = z.id

              -- Point in Polygon: Latitude crossing check
              AND (
                (e.lat1 > dr.latitude::DOUBLE PRECISION)
                <>
                (
                  COALESCE(e.lat2, e.first_lat)
                  > dr.latitude::DOUBLE PRECISION
                )
              )

              -- Point in Polygon: Longitude intersection check
              AND (
                dr.longitude::DOUBLE PRECISION
                <
                (
                  (
                    COALESCE(e.lng2, e.first_lng) - e.lng1
                  )
                  *
                  (
                    dr.latitude::DOUBLE PRECISION - e.lat1
                  )
                  /
                  NULLIF(
                    COALESCE(e.lat2, e.first_lat) - e.lat1,
                    0
                  )
                ) + e.lng1
              )
          )

        WHERE z.company_id = $1

        GROUP BY z.id
      ),

      zone_jobs AS (
        SELECT
          pickup_plot AS zone_id,

          COUNT(*) FILTER (
            WHERE
              (pickup_date || ' ' ||
                COALESCE(pickup_time, '00:00:00'))::TIMESTAMP <= NOW()
              AND driver_id IS NULL
          )::INTEGER AS j0_jobs,

          COUNT(*) FILTER (
            WHERE
              (pickup_date || ' ' ||
                COALESCE(pickup_time, '00:00:00'))::TIMESTAMP > NOW()
              AND
              (pickup_date || ' ' ||
                COALESCE(pickup_time, '00:00:00'))::TIMESTAMP
                  <= NOW() + INTERVAL '15 minutes'
              AND driver_id IS NULL
          )::INTEGER AS j15_jobs,

          COUNT(*) FILTER (
            WHERE
              (pickup_date || ' ' ||
                COALESCE(pickup_time, '00:00:00'))::TIMESTAMP
                  > NOW() + INTERVAL '15 minutes'
              AND
              (pickup_date || ' ' ||
                COALESCE(pickup_time, '00:00:00'))::TIMESTAMP
                  <= NOW() + INTERVAL '30 minutes'
              AND driver_id IS NULL
          )::INTEGER AS j30_jobs

        FROM bookings

        WHERE trash = false
          AND hidden = false
          AND completed = false
          AND driver_id IS NULL
          AND company_id = $1
          AND pickup_plot IS NOT NULL

        GROUP BY pickup_plot
      )

      SELECT
        z.id AS zone_id,
        z.name AS zone_name,
        z.secondary_name,

        COALESCE(d.driver_count, 0)::INTEGER
          AS available_drivers,

        COALESCE(j.j0_jobs, 0)::INTEGER AS j0_count,
        COALESCE(j.j15_jobs, 0)::INTEGER AS j15_count,
        COALESCE(j.j30_jobs, 0)::INTEGER AS j30_count

      FROM zones z

      LEFT JOIN zone_drivers d
        ON d.zone_id = z.id

      LEFT JOIN zone_jobs j
        ON j.zone_id = z.id

      WHERE z.company_id = $1

      ORDER BY z.id ASC;
    `;

    const { rows } = await pool.query(query, [company_id]);

    return rows;
  }
}

module.exports = MatrixModel;
