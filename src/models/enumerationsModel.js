const db = require("../db");

const EnumerationsModel = {
  getAll: async (company_id) => {
    // BOOKING STATUS
    const booking_statuses = await db.query(
      `SELECT * FROM booking_statuses ORDER BY id ASC`,
    );

    // BOOKING TYPES
    const booking_types = await db.query(
      `SELECT * FROM booking_types ORDER BY id ASC`,
    );

    // JOURNEY TYPES
    const journey_types = await db.query(
      `SELECT * FROM journey_types ORDER BY id ASC`,
    );

    // PAYMENT STATUS
    const payment_statuses = await db.query(
      `SELECT * FROM payment_statuses ORDER BY id ASC`,
    );

    // PAYMENT TYPES
    const payment_types = await db.query(
      `SELECT * FROM payment_types ORDER BY id ASC`,
    );

    // VEHICLE TYPES
    const vehicle_types = await db.query(
      `SELECT * FROM vehicle_types WHERE company_id = $1 ORDER BY id ASC`,[company_id]
    );

    // SUBSIDIARIES
    const subsidiaries = await db.query(
      `SELECT id, background_color, foreground_color, name FROM subsidiaries WHERE company_id = $1 ORDER BY id ASC`,[company_id]
    );

    // LIST OF LOGGED IN DRIVERS
    // const sql = `SELECT id, username, name, email FROM drivers WHERE session_status = $1 AND active = $2 ORDER BY id ASC`;
    // const drivers = await db.query(sql, ["logged_in", true]);

    const query = `
        SELECT 
          d.id,
          d.name AS username,
          d.username AS name,
          d.zone,
          d.last_login_at,
          
          -- vehicle type name (dynamic)
          CASE 
            WHEN d.use_company_vehicle = true THEN vt_cv.name
            ELSE vt_v.name
          END AS vehicle_type
    
        FROM drivers d
    
        -- company vehicle
        LEFT JOIN company_vehicles cv 
          ON cv.id = d.company_vehicle_id
    
        LEFT JOIN vehicle_types vt_cv 
          ON vt_cv.id = cv.vehicle_type_id
    
        -- personal vehicle
        LEFT JOIN vehicles v 
          ON v.id = d.vehicle_id
    
        LEFT JOIN vehicle_types vt_v 
          ON vt_v.id = v.vehicle_type_id
    
        WHERE 
          d.session_status = 'logged_in'
          AND d.driver_status = 'Available'
          AND d.booking_status = 'Available'
          AND d.company_id = $1
      `;

    const drivers = await db.query(query,[company_id]);

    // BOOKING TABS WITH COUNTS
    const booking_tabs = await db.query(`
      SELECT
        bt.id,
        bt.booking_tabs,
        CASE bt.id
          WHEN 1 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE DATE(pickup_date) = CURRENT_DATE 
            AND booking_status_id = 1 AND trash = false
          )
          WHEN 2 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE DATE(pickup_date) > CURRENT_DATE AND trash = false
          )
          WHEN 3 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_status_id != 11 AND booking_status_id != 1 AND trash = false
          )
          WHEN 4 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_status_id = 11 AND trash = false
          )
          WHEN 5 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE quoted = true AND trash = false
          )
          WHEN 6 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_source = 'ivr' AND trash = false
          )
          WHEN 7 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_source = 'web' AND trash = false
          )
          WHEN 8 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_source = 'app' AND trash = false
          )
        END::int AS booking_count
      FROM booking_tabs bt
      ORDER BY bt.id ASC
    `);

    // FARE CONFIGURATIONS
    const fare_configurations = await db.query(
      `SELECT 
      f.*, 
      vt.name AS vehicle_type_name, 
      vt.minimum_fares AS vehicle_minimum_fare
        FROM fare_configurations f
          LEFT JOIN vehicle_types vt ON vt.id = f.vehicle_type_id
          WHERE f.company_id = $1
        ORDER BY id ASC`, [company_id]
    );

    // FIXED FARES
    const fixed_fares = await db.query(
      `SELECT 
    f.*,
    vt.name AS vehicle_type_name,
    lf.name AS from_location_name,
    lt.name AS to_location_name
      FROM fixed_fares f
        JOIN vehicle_types vt 
          ON f.vehicle_type_id = vt.id
        JOIN location_types lf 
           ON f.from_location_id = lf.id
        JOIN location_types lt 
          ON f.to_location_id = lt.id
          WHERE f.company_id = $1
      ORDER BY f.id ASC`, [company_id]
    );

    // PLOT FARES
    const plot_fares = await db.query(
      `SELECT 
        pf.*, 
        vt.name AS vehicle_type_name,
        p1.id AS pickup_plot_id, p1.name AS pickup_plot_name,
        p2.id AS dropoff_plot_id, p2.name AS dropoff_plot_name
      FROM plot_fares pf
      JOIN vehicle_types vt ON vt.id = pf.vehicle_type_id
      JOIN zones p1 ON p1.id = pf.pickup_plot_id
      JOIN zones p2 ON p2.id = pf.dropoff_plot_id
      WHERE pf.company_id = $1
      ORDER BY pf.id ASC`, [company_id]
    );

    // FARES BY VEHICLE
    const fare_by_vehicles = await db.query(
      ` SELECT fbv.*, row_to_json(vt) as vehicle_type
    FROM fare_by_vehicles fbv
    LEFT JOIN vehicle_types vt ON fbv.vehicle_type_id = vt.id
    WHERE fbv.company_id = $1
    ORDER BY fbv.id ASC`, [company_id]
    );

    //AIRPORT CHARGES
    const airport_charges = await db.query(
      ` SELECT l.*,
                   to_json(lt) AS location_type
            FROM locations l
            LEFT JOIN location_types lt
              ON lt.id = l.location_type_id
            WHERE l.location_type_id = 2 AND l.company_id = $1
            ORDER BY l.id ASC`,[company_id]
    );

    return {
      booking_statuses: booking_statuses.rows,
      booking_types: booking_types.rows,
      journey_types: journey_types.rows,
      payment_statuses: payment_statuses.rows,
      payment_types: payment_types.rows,
      vehicle_types: vehicle_types.rows,
      subsidiaries: subsidiaries.rows,
      drivers: drivers.rows,
      booking_tabs: booking_tabs.rows,
      fare_configurations: fare_configurations.rows,
      fixed_fares: fixed_fares.rows,
      plot_fares: plot_fares.rows,
      fare_by_vehicles: fare_by_vehicles.rows,
      airport_charges: airport_charges.rows,
    };
  },

  getPaymentTypes: async () => {
    // PAYMENT TYPES
    const payment_types = await db.query(
      `SELECT * FROM payment_types ORDER BY id ASC`,
    );
    return {
      payment_types: payment_types.rows,
    };
  },
};

module.exports = EnumerationsModel;
