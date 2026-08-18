const pool = require("../db");
const {
  waitForKeypress,
  transfer,
  hangup,
  formatMobile,
} = require("../utils/ivrHelpers");
const {
  calculateDistanceAndTimeOSRM,
} = require("../utils/calculateDistance&Time");
const { calculateSingleFare } = require("../controllers/fareController");
const ivrNotifcation = require("../services/notificationService");
const bookingModel = require("../models/bookingModel");
const genRef = async () => {
  let ref;
  let exists = true;

  while (exists) {
    const digits = Math.floor(10000 + Math.random() * 90000).toString();
    ref = "NTG" + digits;

    const result = await pool.query(
      `SELECT reference_number FROM bookings WHERE reference_number = $1 LIMIT 1`,
      [ref],
    );

    if (result.rows.length === 0) exists = false;
  }

  return ref;
};

const SYSTEM_TOKEN = process.env.SYSTEM_TOKEN;
const OFFICE_NUMBER = process.env.OFFICE_NUMBER || "401";
const SYSTEM_TOKEN_FALLBACK = process.env.SYSTEM_TOKEN_FALLBACK;

const sessions = new Map(); // fallback sessions
const attempts = new Map();

exports.hangup = hangup;

async function getCompanyByIVR(number) {
  const result = await pool.query(
    `
    SELECT id, company_name
    FROM company_clients
    WHERE mobile = $1
    AND status='active'
    LIMIT 1
    `,
    [number]
  );

  return result.rows[0] || null; // Returns object { id, company_name } or null
}

/* =====================================================
   MAIN IVR (Driver + Customer Flow)
===================================================== */

exports.handleMainIvr = async (body) => {
  const { systemToken, uniqueCallId, callerNumber, text, incomingNumber } =
    body;

  if (systemToken !== SYSTEM_TOKEN) return hangup("Unauthorized");

  // Get Company Details
  const company = await getCompanyByIVR(incomingNumber);

  if (!company) {
    console.log("IVR COMPANY NOT FOUND:", incomingNumber);

    return transfer(
      OFFICE_NUMBER,
      "Company not found. Please hold while we transfer your call.",
    );
  }

  const companyId = company.id;
  const companyName = company.company_name;

  const formattedNumber = formatMobile(callerNumber);
  const ACTIVE_STATUS = [3, 6, 10, 15];

  /* =====================================================
     CHECK DRIVER
  ===================================================== */
  const driverRes = await pool.query(
    `SELECT id FROM drivers WHERE mobile = $1 AND company_id=$2`,
    [formattedNumber, companyId],
  );

  const isDriver = driverRes.rows.length > 0;

  /* =====================================================
     CHECK CUSTOMER
  ===================================================== */
  const customerRes = await pool.query(
    `SELECT id FROM customers WHERE mobile = $1 AND company_id=$2`,
    [formattedNumber, companyId],
  );

  const isCustomer = customerRes.rows.length > 0;

  /* =====================================================
     CASE 1: UNKNOWN NUMBER
  ===================================================== */
  if (!isDriver && !isCustomer) {
    console.log("FLOW: UNKNOWN USER → DIRECT TRANSFER");

    return transfer(
      OFFICE_NUMBER,
      `Welcome to ${companyName}. Thank you for using our service. Please hold while we transfer your call to an operator.`
    );
  }

  /* =====================================================
     DRIVER FLOW
  ===================================================== */
  if (isDriver) {
    const driverId = driverRes.rows[0].id;

    const bookingRes = await pool.query(
      `SELECT b.booking_status_id, c.mobile
       FROM bookings b
       JOIN customers c ON b.customer_id = c.id
       WHERE b.driver_id = $1
       AND b.company_id=$2
       ORDER BY b.id DESC
       LIMIT 1`,
      [driverId, companyId],
    );

    console.log("FLOW:", {
      type: "DRIVER",
      status: bookingRes?.rows[0]?.booking_status_id,
    });

    // 🔹 CASE 5: NO BOOKING OR NOT ACTIVE
    if (
      !bookingRes.rows.length ||
      !ACTIVE_STATUS.includes(bookingRes.rows[0].booking_status_id)
    ) {
      console.log("FLOW: DRIVER NO ACTIVE BOOKING → OPERATOR");

      return transfer(
        OFFICE_NUMBER,
        `Welcome back to ${companyName}. Please hold while we transfer your call to an operator.`
      );
    }

    // 🔹 CASE 4: DRIVER WITH ACTIVE BOOKING
    if (!text) {
      console.log("FLOW: DRIVER MENU");

      return waitForKeypress(
        `Welcome back to ${companyName}. Press 1 for your Customer. Press 0 for Operator`
      );
    }

    if (text === "1") {
      console.log("FLOW: DRIVER → CUSTOMER CONNECT");

      return transfer(bookingRes.rows[0].mobile);
    }

    if (text === "0") {
      console.log("FLOW: DRIVER → OPERATOR");

      return transfer(OFFICE_NUMBER);
    }

    return hangup();
  }

  /* =====================================================
     CUSTOMER FLOW
  ===================================================== */
  if (isCustomer) {
    const bookingRes = await pool.query(
      `SELECT b.booking_status_id, d.mobile
       FROM bookings b
       JOIN drivers d ON b.driver_id = d.id
       WHERE b.mobile = $1
       AND b.company_id=$2
       ORDER BY b.id DESC
       LIMIT 1`,
      [formattedNumber, companyId],
    );

    const hasActiveBooking =
      bookingRes.rows.length &&
      ACTIVE_STATUS.includes(bookingRes.rows[0].booking_status_id);

    console.log("FLOW:", {
      type: "CUSTOMER",
      status: bookingRes?.rows[0]?.booking_status_id,
      hasActiveBooking,
    });

    // 🔹 CASE 3: CUSTOMER WITH ACTIVE BOOKING
    if (hasActiveBooking) {
      if (!text) {
        console.log("FLOW: CUSTOMER ACTIVE BOOKING MENU");

        return waitForKeypress(
          `Welcome back to ${companyName}. Press 1 for your Driver. Press 0 for Operator`
        );
      }

      if (text === "1") {
        console.log("FLOW: CUSTOMER → DRIVER CONNECT");

        return transfer(bookingRes.rows[0].mobile);
      }

      if (text === "0") {
        console.log("FLOW: CUSTOMER → OPERATOR");

        return transfer(OFFICE_NUMBER);
      }

      return hangup();
    }

    // 🔹 CASE 2: CUSTOMER WITHOUT BOOKING → FALLBACK FLOW
    console.log("FLOW: CUSTOMER → FALLBACK FLOW");

    // 🔥 IMPORTANT: DIRECTLY CALL FALLBACK SERVICE
    return await exports.handleFallbackIvr({
      ...body,
      systemToken: SYSTEM_TOKEN_FALLBACK, // override token
    });
  }

  return hangup();
};

exports.handleFallbackIvr = async (body) => {
  const { systemToken, uniqueCallId, callerNumber, text, incomingNumber } =
    body;
  const company = await getCompanyByIVR(incomingNumber);

  if (!company) {
    console.log("IVR COMPANY NOT FOUND:", incomingNumber);

    return transfer(
      OFFICE_NUMBER,
      "Company not found. Please hold while we transfer your call.",
    );
  }

  const companyId = company.id;
  const companyName = company.company_name;

  if (systemToken !== SYSTEM_TOKEN_FALLBACK) return hangup("Unauthorized");

  if (!sessions.has(uniqueCallId)) {
    sessions.set(uniqueCallId, {
      step: 1,
      company_id: companyId,
      company_name: companyName,
      pickup: null,
      dropoff: null,
      pickup_latitude: null,
      pickup_longitude: null,
      dropoff_latitude: null,
      dropoff_longitude: null,
      vehicle_type_id: null,
      name: null,
      email: null,
      mobile: null,
      telephone: null,
      subsidiary_id: null,
      employee_id: null,
      jobs: [],
    });
  }

  const session = sessions.get(uniqueCallId);

  const sessionCompanyId = session.company_id || companyId;
  /* STEP 1 - PICKUP MENU */
  if (session.step === 1) {
    if (!text)
      return waitForKeypress(
        `Welcome back to ${session.company_name}. Thank you for calling. Press 1 to book a cab. Press 0 to contact the operator.`
      );

    if (text === "0") return transfer(OFFICE_NUMBER);

    if (text === "1") {
      const jobsRes = await pool.query(
        `SELECT 
          b.pickup,
          b.dropoff,
          b.pickup_latitude,
          b.pickup_longitude,
          b.dropoff_latitude,
          b.dropoff_longitude,
          b.vehicle_type_id,
          b.subsidiary_id,
          b.employee_id,
          c.name,
          c.email,
          c.mobile,
          c.telephone
        FROM bookings b
        JOIN customers c ON b.customer_id = c.id
        WHERE b.mobile = $1
        AND b.company_id=$2
        ORDER BY b.id DESC
        LIMIT 10`,
        [callerNumber, sessionCompanyId],
      );

      if (!jobsRes.rows.length) return hangup("No recent jobs found.");

      // Unique pickup filtering
      const seenPickups = new Set();
      const uniqueJobs = [];
      jobsRes.rows.forEach((j) => {
        if (!seenPickups.has(j.pickup) && uniqueJobs.length < 3) {
          seenPickups.add(j.pickup);
          uniqueJobs.push(j);
        }
      });
      if (!uniqueJobs.length) {
        return hangup("No pickup locations found.");
      }
      session.jobs = uniqueJobs;
      session.step = 2;

      let menu = "For pickup location ";
      session.jobs.forEach((j, i) => {
        menu += `press ${i + 1} for ${j.pickup}. `;
      });

      return waitForKeypress(menu);
    }

    return hangup();
  }

  /* STEP 2 - PICKUP SELECTION */
  if (session.step === 2) {
    if (!text) return hangup("Invalid selection.");
    const index = parseInt(text) - 1;
    if (!session.jobs[index]) return hangup("Invalid pickup selection.");

    const job = session.jobs[index];

    // Save pickup + customer info
    session.pickup = job.pickup;
    session.pickup_latitude = job.pickup_latitude;
    session.pickup_longitude = job.pickup_longitude;
    session.vehicle_type_id = job.vehicle_type_id;
    session.name = job.name;
    session.email = job.email;
    session.mobile = job.mobile;
    session.telephone = job.telephone;
    session.subsidiary_id = job.subsidiary_id;
    session.employee_id = job.employee_id;

    // Unique dropoff filtering
    const seenDropoffs = new Set();
    const uniqueDropJobs = [];

    session.jobs.forEach((j) => {
      if (!seenDropoffs.has(j.dropoff) && uniqueDropJobs.length < 3) {
        seenDropoffs.add(j.dropoff);
        uniqueDropJobs.push(j);
      }
    });
    session.jobs = uniqueDropJobs;
    session.step = 3;

    let dropMenu = "For dropoff location ";
    session.jobs.forEach((j, i) => {
      dropMenu += `press ${i + 1} for ${j.dropoff}. `;
    });

    return waitForKeypress(dropMenu);
  }

  /* STEP 3 - DROPOFF SELECTION */
  if (session.step === 3) {
    if (!text) return hangup("Invalid selection.");
    const index = parseInt(text) - 1;
    if (!session.jobs[index]) return hangup("Invalid dropoff selection.");

    const job = session.jobs[index];
    session.dropoff = job.dropoff;
    session.dropoff_latitude = job.dropoff_latitude;
    session.dropoff_longitude = job.dropoff_longitude;
    session.step = 4;

    return waitForKeypress(
      `You selected pickup ${session.pickup} and dropoff ${session.dropoff}. Press 1 to confirm booking. Press 2 to cancel.`,
    );
  }

  /* STEP 4 - CONFIRM & FAST INSERT (ASYNC DISTANCE) */
  if (session.step === 4) {
    if (text === "2") return hangup("Booking cancelled.");
    if (text !== "1") return hangup("Invalid option.");

    const now = new Date();
    const pickup_date = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const pickup_time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;

    const reference_number = await genRef();
    const formattedNumber = formatMobile(callerNumber);

    const customerRes = await pool.query(
      `SELECT id FROM customers WHERE mobile = $1 AND company_id=$2
LIMIT 1`,
      [formattedNumber, sessionCompanyId],
    );

    if (!customerRes.rows.length) return hangup("Customer not found.");
    const customerId = customerRes.rows[0].id;

    /* 🚀 STEP 1: FAST INSERT (NO OSRM WAIT) */
    const bookingRes = await pool.query(
      `INSERT INTO bookings (
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
      subsidiary_id,
      employee_id,
      name,
      email,
      mobile,
      telephone,
      miles,
      eta,
      fares,
      total_charges,
      booking_source,
      booking_status_id,
      journey_type_id,
      booking_type_id,
      payment_type_id,
      viapoints,
      restricted_drivers,
      child_seat,
      notes,
      sms,
      on_route,
      arrived,
      passenger_on_board,
      completed,
      controller_completed,
      company_id
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,
      NULL,NULL,0,0,
      'ivr',1,1,1,1,
      '[]','[]','[]','[]',
      true,false,false,false,false,false,$18
    ) RETURNING id`,
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
        session.subsidiary_id,
        session.employee_id,
        session.name,
        session.email,
        session.mobile,
        session.telephone,
        sessionCompanyId,
      ],
    );

    const bookingId = bookingRes.rows[0].id;

    /* 🚀 STEP 2: BACKGROUND DISTANCE + FARE */
    setImmediate(async () => {
      try {
        console.time("osrm-background");

        const { miles, eta } = await calculateDistanceAndTimeOSRM(
          session.pickup_latitude,
          session.pickup_longitude,
          session.dropoff_latitude,
          session.dropoff_longitude,
        );

        console.timeEnd("osrm-background");

        const fareData = await calculateSingleFare({
          pickup_date,
          pickup_time,
          vehicle_type_id: session.vehicle_type_id,
          pickup: session.pickup,
          dropoff: session.dropoff,
          miles,
        });

        const fares = fareData?.fare || 0.0;
        const total_charges = fareData?.total_fare || fares;

        await pool.query(
          `UPDATE bookings
         SET miles=$1, eta=$2, fares=$3, total_charges=$4
         WHERE id=$5`,
          [miles, eta, fares, total_charges, bookingId],
        );
        const ivrBooking = await bookingModel.getBookingByIdEnriched(bookingId);
        await ivrNotifcation.sendIVRBookingNotification(
          ivrBooking,
          sessionCompanyId,
        );
      } catch (err) {
        console.error("Background fare calculation failed:", err);
      }
    });

    session.step = 5;

    /* 🚀 STEP 3: INSTANT IVR RESPONSE */
    return waitForKeypress(
      "Booking confirmed. Press 1 for operator. Press 0 to hangup.",
    );
  }

  /* STEP 5 - AFTER CONFIRMATION */
  if (session.step === 5) {
    if (!text)
      return waitForKeypress("Press 1 for operator. Press 0 to hangup.");

    if (text === "1") {
      sessions.delete(uniqueCallId);
      return transfer(OFFICE_NUMBER);
    }
    if (text === "0") {
      sessions.delete(uniqueCallId);
      return hangup("Thank you for calling.");
    }
    return waitForKeypress(
      "Invalid option. Press 1 for operator. Press 0 to hangup.",
    );
  }

  return hangup();
};
