const db = require("../db");

const ALLOWED_FIELDS = [
  "show_customer_number",
  "enable_customer_call",
  "enable_flagdown",
  "show_account_fare",
  "hide_break",
  "hide_decline",
  "hide_recover",
  "hide_no_pickup",
  "hide_pickup",
  "hide_dropoff",
  "fare_meter",
  "disable_fare_meter_account_job",
  "fare_meter_waiting_charges",
  "pay_by_card",
  "waiting_after_arrival",
  "send_receipt",
  "show_plot",
  "disable_panic_buton",
  "show_navigation",
  "show_sta_near_500_yards",
  "show_fare",
  "has_company_car",
  "hide_payment_type",
  "enable_toll_charges",
  "booking_timer",
  "break_timer",
  "mobile_imei_number",
  "mobile_make",
  "mobile_model",
  "mobile_sim_network",
  "mobile_sim_number",
  "mobile_network_provider",
  "mobile_data_allowance",
  "pda_deposit",
  "pda_comments",
];

/* GET */
exports.getByDriverId = async (driver_id, company_id) => {
  const { rows } = await db.query(
    `SELECT * FROM driver_app_features WHERE driver_id = $1 AND company_id = $2`,
    [driver_id, company_id],
  );
  return rows[0];
};

/* UPDATE (SAFE) */
exports.updateFeatures = async (driver_id, payload) => {
  const keys = Object.keys(payload).filter((k) => ALLOWED_FIELDS.includes(k));

  if (!keys.length) return null;

  const values = keys.map((k) => payload[k]);

  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");

  const query = `
    UPDATE driver_app_features
    SET ${setClause},
        updated_at = NOW()
    WHERE driver_id = $${keys.length + 1}
    RETURNING *
  `;

  const { rows } = await db.query(query, [...values, driver_id]);
  return rows[0];
};
