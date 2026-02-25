const db = require("../db");

const EnumerationsModel = {
  getAll: async () => {
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
      `SELECT * FROM vehicle_types ORDER BY id ASC`,
    );

    // SUBSIDIARIES
    const subsidiaries = await db.query(
      `SELECT id, background_color, foreground_color, name FROM subsidiaries ORDER BY id ASC`,
    );

    // LIST OF LOGGED IN DRIVERS
    const sql = `SELECT id, username, name, email FROM drivers WHERE session_status = $1 AND active = $2 ORDER BY id ASC`;
    const drivers = await db.query(sql, ["logged_in", true]);

    // BOOKING TABS WITH COUNTS
    const booking_tabs = await db.query(`
      SELECT
        bt.id,
        bt.booking_tabs,
        CASE bt.id
          WHEN 1 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE DATE(pickup_date) = CURRENT_DATE 
            AND booking_status_id = 1
          )
          WHEN 2 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE DATE(pickup_date) > CURRENT_DATE
          )
          WHEN 3 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_status_id != 11 AND booking_status_id != 1
          )
          WHEN 4 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_status_id = 11
          )
          WHEN 5 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE quoted = true
          )
          WHEN 6 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_source = 'ivr'
          )
          WHEN 7 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_source = 'web'
          )
          WHEN 8 THEN (
            SELECT COUNT(*) FROM bookings 
            WHERE booking_source = 'app'
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
        ORDER BY id ASC`,
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
      ORDER BY f.id ASC`,
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
      ORDER BY pf.id ASC`,
    );

    // FARES BY VEHICLE
    const fare_by_vehicles = await db.query(
      ` SELECT fbv.*, row_to_json(vt) as vehicle_type
    FROM fare_by_vehicles fbv
    LEFT JOIN vehicle_types vt ON fbv.vehicle_type_id = vt.id
    ORDER BY fbv.id ASC`,
    );

    //AIRPORT CHARGES
    const airport_charges = await db.query(
      ` SELECT l.*,
                   to_json(lt) AS location_type
            FROM locations l
            LEFT JOIN location_types lt
              ON lt.id = l.location_type_id
            WHERE l.location_type_id = 2
            ORDER BY l.id ASC`,
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
