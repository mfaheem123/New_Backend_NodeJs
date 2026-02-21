const pool = require("../db");
const {
  waitForKeypress,
  transfer,
  hangup,
  formatMobile,
} = require("../utils/ivrHelpers");

const SYSTEM_TOKEN = process.env.SYSTEM_TOKEN;
const OFFICE_NUMBER = process.env.OFFICE_NUMBER || "401";

const sessions = new Map(); // fallback sessions
const attempts = new Map();

exports.hangup = hangup;

/* =====================================================
   MAIN IVR (Driver + Customer Flow)
===================================================== */

exports.handleMainIvr = async (body) => {
  const { systemToken, uniqueCallId, callerNumber, text } = body;

  if (systemToken !== SYSTEM_TOKEN) return hangup("Unauthorized");

  const formattedNumber = formatMobile(callerNumber);
  const attemptKey = uniqueCallId || formattedNumber;

  if (!attempts.has(attemptKey)) attempts.set(attemptKey, 0);

  /* ---------------- CHECK DRIVER ---------------- */

  const driverRes = await pool.query(
    `SELECT id FROM drivers WHERE mobile = $1`,
    [formattedNumber],
  );

  const isDriver = driverRes.rows.length > 0;

  /* ================= DRIVER FLOW ================= */

  if (isDriver) {
    if (!text)
      return waitForKeypress(
        "Press 1 to connect your latest customer. Press 2 for operator.",
      );

    if (text === "1") {
      const bookingRes = await pool.query(
        `SELECT c.mobile
         FROM bookings b
         JOIN customers c ON b.customer_id = c.id
         WHERE b.driver_id = $1
         ORDER BY b.id DESC
         LIMIT 1`,
        [driverRes.rows[0].id],
      );

      if (bookingRes.rows.length) return transfer(bookingRes.rows[0].mobile);

      return waitForKeypress("No recent customer found. Press 2 for operator.");
    }

    if (text === "2") return transfer(OFFICE_NUMBER);

    return hangup();
  }

  /* ================= CUSTOMER FLOW ================= */

  const bookingRes = await pool.query(
    `SELECT d.mobile
     FROM bookings b
     JOIN drivers d ON b.driver_id = d.id
     WHERE b.mobile = $1
     ORDER BY b.id DESC
     LIMIT 1`,
    [formattedNumber],
  );
  const GREETING = process.env.IVR_GREETING || "Nexus Tech Groups.";
  if (!text) {
    console.log("Mobile Number", formattedNumber)
    console.log("Booking Found",bookingRes.rows.length);

    if (!bookingRes.rows.length) {
      // ✅ NEW CUSTOMER (no previous booking)
      return waitForKeypress(
        `Welcome to ${GREETING} Press 1 to connect the operator.`,
      );
    }

    // ✅ EXISTING CUSTOMER
    return waitForKeypress(
      `Welcome back to ${GREETING} Press 1 to connect your driver. Press 2 for operator.`,
    );
  }

  if (text === "1") {
    // 🔹 NEW CUSTOMER → connect operator
    if (!bookingRes.rows.length) {
      return transfer(OFFICE_NUMBER);
    }

    // 🔹 EXISTING CUSTOMER → connect driver
    return transfer(bookingRes.rows[0].mobile);
  }

  if (text === "2") return transfer(OFFICE_NUMBER);

  return hangup();
};

/* =====================================================
   FALLBACK IVR (Dynamic Booking Create - PostgreSQL)
===================================================== */

async function genRef() {
  let ref;
  let exists = true;

  while (exists) {
    const digits = Math.floor(10000 + Math.random() * 90000).toString();
    ref = "NTG" + digits;

    const checkQuery = `SELECT reference_number FROM bookings WHERE reference_number = $1 LIMIT 1`;
    const result = await pool.query(checkQuery, [ref]);

    if (result.rows.length === 0) exists = false;
  }
  return ref;
}

exports.handleFallbackIvr = async (body) => {
  const { systemToken, uniqueCallId, callerNumber, text } = body;

  if (systemToken !== process.env.SYSTEM_TOKEN_FALLBACK)
    return hangup("Unauthorized");

  if (!sessions.has(uniqueCallId)) {
    sessions.set(uniqueCallId, {
      step: 1,
      pickup: null,
      dropoff: null,
      pickup_date: null,
      pickup_time: null,
      vehicle_type_id: null,
      name: null,
      email: null,
      mobile: null,
      telephone: null,
    });
  }

  const session = sessions.get(uniqueCallId);

  /* STEP 1 */
  if (session.step === 1) {
    if (!text)
      return waitForKeypress(
        "Press 1 to repeat previous journey. Press 2 for operator.",
      );

    if (text === "2") return transfer(OFFICE_NUMBER);

    if (text === "1") {
      session.step = 2;

      const jobs = await pool.query(
        `SELECT 
      pickup,
      dropoff,
      pickup_latitude,
      pickup_longitude,
      dropoff_latitude,
      dropoff_longitude,
      vehicle_type_id,
      name,
      email,
      mobile,
      telephone
      FROM bookings b
      JOIN customers c ON b.customer_id = c.id
      WHERE c.mobile = $1
      ORDER BY b.id DESC
      LIMIT 3`,
        [callerNumber],
      );

      if (!jobs.rows.length) return hangup("No recent jobs found.");

      session.jobs = jobs.rows;

      let menu = "For pickup location ";
      jobs.rows.forEach((j, i) => {
        menu += `press ${i + 1} for ${j.pickup}. `;
      });

      return waitForKeypress(menu);
    }

    return hangup();
  }

  /* STEP 2 PICKUP */
  if (session.step === 2) {
    const index = parseInt(text) - 1;

    if (!session.jobs[index]) return hangup("Invalid selection.");

    const selectedJob = session.jobs[index];

    session.pickup = selectedJob.pickup;
    session.dropoff = selectedJob.dropoff;
    session.pickup_latitude = selectedJob.pickup_latitude;
    session.pickup_longitude = selectedJob.pickup_longitude;
    session.dropoff_latitude = selectedJob.dropoff_latitude;
    session.dropoff_longitude = selectedJob.dropoff_longitude;
    session.vehicle_type_id = selectedJob.vehicle_type_id;
    session.name = selectedJob.name;
    session.email = selectedJob.email;
    session.mobile = selectedJob.mobile;
    session.telephone = selectedJob.telephone;

    session.step = 3;

    return waitForKeypress(
      `Press 1 to confirm booking from ${session.pickup} to ${session.dropoff}. Press 2 to cancel.`,
    );
  }

  /* STEP 3 CONFIRM */
  if (session.step === 3) {
    if (text === "2") return hangup("Booking cancelled.");

    if (text === "1") {
      const now = new Date();

      const pickup_date =
        now.getFullYear() + "-" + (now.getMonth() + 1) + "-" + now.getDate();

      const pickup_time =
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0");

      const reference_number = await genRef();

      // 1️⃣ Get customer id
      const customerRes = await pool.query(
        `SELECT id FROM customers WHERE mobile = $1`,
        [callerNumber],
      );

      if (!customerRes.rows.length) return hangup("Customer not found.");

      const customerId = customerRes.rows[0].id;

      // 2️⃣ Insert booking with lat/lng
      await pool.query(
        `INSERT INTO bookings
          (
          customer_id,
          pickup,
          dropoff,
          pickup_latitude,
          pickup_longitude,
          dropoff_latitude,
          dropoff_longitude,
          pickup_date,
          pickup_time,
          reference_number,
          vehicle_type_id,
          name,
          email,
          mobile,
          telephone,
          booking_source,
          booking_status_id,
          journey_type_id,
          booking_type_id,
          payment_type_id
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15'ivr',1,1,1,1)`,
        [
          customerId,
          session.pickup,
          session.dropoff,
          session.pickup_latitude,
          session.pickup_longitude,
          session.dropoff_latitude,
          session.dropoff_longitude,
          pickup_date,
          pickup_time,
          reference_number,
          session.vehicle_type_id,
          session.name,
          session.email,
          session.mobile,
          session.telephone,
        ],
      );

      return waitForKeypress(
        "Booking confirmed. Press 1 for operator. Press 0 to hangup.",
      );
    }

    return hangup();
  }

  return hangup();
};
