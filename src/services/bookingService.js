const {
  pool,
  insertBookingRow,
  updateBooking,
  findBookingById,
  findBookingsById,
  getBookingByIdEnriched,
} = require("../models/bookingModel");
const { sendBookingNotification } = require("./notificationService");
const { sendBookingSMS } = require("../utils/sendBookingSMS");
const { calculateSingleFare } = require("../controllers/fareController");
const driverAppFeatureModel = require("../models/driverAppFeaturesModel");

const DEFAULT_EMPLOYEE_ID = 28;

const parseJSONFields = (row) => {
  if (!row) return row;

  const jsonFields = [
    "viapoints",
    "restricted_drivers",
    "notes",
    "child_seat",
    "skipped_bookings",
  ];

  const parsed = { ...row };

  jsonFields.forEach((field) => {
    if (parsed[field] && typeof parsed[field] === "string") {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch {
        parsed[field] = [];
      }
    }
  });

  return parsed;
};

function toNullableInt(value) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null"
  ) {
    return null;
  }
  return Number(value);
}

function toNullableFloat(value) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "null"
  ) {
    return null;
  }
  return parseFloat(value);
}

// UNIQUE REFERENCE GENERATOR
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

function strOrNull(v) {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

// NORMALIZER
async function normalizeBookingPayload(src) {
  const b = { ...src };

  const jsonFields = [
    "viapoints",
    "restricted_drivers",
    "child_seat",
    "notes",
    "skipped_bookings",
  ];

  for (const f of jsonFields) {
    if (b[f] !== undefined && b[f] !== null) {
      b[f] = typeof b[f] === "string" ? b[f] : JSON.stringify(b[f]);
    } else {
      b[f] = "[]";
    }
  }

  // Integer fields
  const intFields = [
    "journey_type_id",
    "account_id",
    "vehicle_type_id",
    "vehicle_id",
    "driver_id",
    "passengers",
    "luggages",
    "hand_luggages",
    "payment_type_id",
    "subsidiary_id",
    "booking_status_id",
    "booking_type_id",
    "employee_id",
    "department",
    "escort_id",
    "multi_booking_id",
    "associated_booking",
  ];

  intFields.forEach((field) => {
    if (b[field] !== undefined) {
      b[field] = toNullableInt(b[field]);
    }
  });

  // Float fields
  const floatFields = [
    "fares",
    "total_charges",
    "company_price",
    "parking_charges",
    "waiting_charges",
    "extra_drop_charges",
    "credit_card_charges",
    "congestion_charges",
    "miles",
    "pickup_latitude",
    "pickup_longitude",
    "dropoff_latitude",
    "dropoff_longitude",
  ];

  floatFields.forEach((field) => {
    if (b[field] !== undefined) {
      b[field] = toNullableFloat(b[field]);
    }
  });

  b.quotation = b.quotation || false;
  b.quoted = b.quoted || false;
  b.commission = b.commission === undefined ? true : !!b.commission;
  b.on_route = false;
  b.employee_id = b.employee_id || DEFAULT_EMPLOYEE_ID;

  b.reference_number = b.reference_number || (await genRef());

  if (b.total_charges === undefined || b.total_charges === null) {
    b.total_charges = b.fares ?? 0;
  }

  if (b.emailFlag !== undefined) {
    b.emailflag = b.emailFlag;
    delete b.emailFlag;
  }

  return b;
}

// INSERT BOOKING ROW

async function createBookingRow(pool, bookingObj) {
  // List of allowed DB columns
  const allowed = [
    "reference_number",
    "subsidiary_id",
    "booking_type_id",
    "booking_status_id",
    "journey_type_id",
    "account_id",
    "customer_id",
    "employee_id",
    "pickup",
    "dropoff",
    "pickup_date",
    "pickup_time",
    "dropoff_date",
    "dropoff_time",
    "pickup_door_number",
    "dropoff_door_number",
    "pickup_plot",
    "dropoff_plot",
    "pickup_location_type_id",
    "dropoff_location_type_id",
    "pickup_latitude",
    "pickup_longitude",
    "dropoff_latitude",
    "dropoff_longitude",
    "viapoints",
    "restricted_drivers",
    "flight_number",
    "arriving_from",
    "vehicle_type_id",
    "vehicle_id",
    "driver_id",
    "passengers",
    "luggages",
    "hand_luggages",
    "child_seat",
    "name",
    "email",
    "mobile",
    "telephone",
    "lead_time",
    "notes",
    "special_instructions",
    "payment_type_id",
    "company_price",
    "fares",
    "total_charges",
    "parking_charges",
    "waiting_charges",
    "extra_drop_charges",
    "credit_card_charges",
    "congestion_charges",
    "miles",
    "meet_and_greet",
    "department",
    "escort_id",
    "order_number",
    "booked_by",
    "add_return_fare",
    "fare_meter_status",
    "fare_meter",
    "quotation",
    "quoted",
    "dispatch",
    "dispatch_as",
    "sms",
    "emailflag",
    "trash",
    "hidden",
    "multi_booking_id",
    "associated_booking",
    "invoice_status",
    "commission_status",
    "commission",
    "skipped_bookings",
    "permanent",
    "toggle_driver_text",
    "toggle_passenger_text",
    "cancelled_reason",
    "booking_source",
    "on_route",
    "arrived",
    "passenger_on_board",
    "completed",
    "controller_completed",
    "driver_waiting_time",
    "dispatched_at",
    "booked_at",
    "stripe_customer_id",
    "stripe_payment_id",
    "invoice_number",
    "initial_subsidiary_id",
    "eta",
  ];

  // 🔥 FIX: Properly DEFINE row before using it
  const row = {};
  for (const k of allowed) {
    if (
      Object.prototype.hasOwnProperty.call(bookingObj, k) &&
      bookingObj[k] !== undefined
    ) {
      row[k] = bookingObj[k];
    }
  }

  // defaults
  if (!row.booked_at) row.booked_at = new Date();
  if (row.multi_booking_id === undefined) row.multi_booking_id = 0;

  // INSERT
  const inserted = await insertBookingRow(pool, row);
  return inserted;
}

// CREATE SIMPLE BOOKING

async function createSimpleBooking(payload) {
  try {
    await pool.query("BEGIN");

    let customerId = payload.customer_id || null;

    if (!customerId && payload.customer) {
      const c = payload.customer;
      const res = await pool.query(
        `INSERT INTO customers (name,email,mobile,telephone,blacklist)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email) DO UPDATE SET mobile=EXCLUDED.mobile
         RETURNING id`,
        [
          c.name || payload.name,
          c.email || payload.email,
          c.mobile || payload.mobile,
          c.telephone || payload.telephone,
          c.blacklist || null,
        ],
      );
      customerId = res.rows[0].id;
    } else if (!customerId && payload.email) {
      const res = await pool.query(
        `INSERT INTO customers (name,email,mobile,telephone)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET mobile=EXCLUDED.mobile
         RETURNING id`,
        [payload.name, payload.email, payload.mobile, payload.telephone],
      );
      customerId = res.rows[0].id;
    }
    if (payload.driver_id) {
      const driverFeatures = await driverAppFeatureModel.getByDriverId(
        payload.driver_id,
      );

      if (driverFeatures) {
        payload.fare_meter = !!driverFeatures.fare_meter;
      } else {
        // Agar record hi nahi mila to default false rakh do
        payload.fare_meter = false;
      }
    }
    const normalized = await normalizeBookingPayload(payload);
    if (customerId) normalized.customer_id = customerId;

    const inserted = await createBookingRow(pool, normalized);
    console.log(inserted);

    const enriched = await getBookingByIdEnriched(inserted.id);
    const clean = parseJSONFields(enriched);

    //  SEND SMS
    await sendBookingSMS(clean);

    // SEND NOTIFICATION
    if (clean.driver_id) {
      await sendBookingNotification(clean.driver_id, clean);
    }

    await pool.query("COMMIT");

    // return { booking: [inserted] };
    return { bookings: [clean] };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

// CREATE TWO-WAY BOOKING

async function createTwoWayBooking(payload) {
  try {
    await pool.query("BEGIN");

    let customerId = payload.customer_id || null;
    if (!customerId && payload.customer) {
      const c = payload.customer;
      const res = await pool.query(
        `INSERT INTO customers (name,email,mobile,telephone)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET mobile=EXCLUDED.mobile
         RETURNING id`,
        [
          c.name || payload.name,
          c.email || payload.email,
          c.mobile || payload.mobile,
          c.telephone || payload.telephone,
        ],
      );
      customerId = res.rows[0].id;
    }

    const normalized = await normalizeBookingPayload(payload);
    if (customerId) normalized.customer_id = customerId;

    const primary = await createBookingRow(pool, normalized);

    const returnBooking = { ...normalized };

    returnBooking.pickup = normalized.dropoff;
    returnBooking.dropoff = normalized.pickup;

    returnBooking.pickup_door_number = normalized.dropoff_door_number;
    returnBooking.dropoff_door_number = normalized.pickup_door_number;

    returnBooking.pickup_plot = normalized.dropoff_plot;
    returnBooking.dropoff_plot = normalized.pickup_plot;

    returnBooking.pickup_location_type_id = normalized.dropoff_location_type_id;
    returnBooking.dropoff_location_type_id = normalized.pickup_location_type_id;

    returnBooking.pickup_latitude = normalized.dropoff_latitude;
    returnBooking.pickup_longitude = normalized.dropoff_longitude;
    returnBooking.dropoff_latitude = normalized.pickup_latitude;
    returnBooking.dropoff_longitude = normalized.pickup_longitude;

    returnBooking.associated_booking = primary.id;
    returnBooking.reference_number = await genRef();
    returnBooking.driver_id = returnBooking.driver_id || null;
    returnBooking.on_route = false;

    const retInserted = await createBookingRow(pool, returnBooking);

    const primaryEnriched = await getBookingByIdEnriched(primary.id);
    const returnEnriched = await getBookingByIdEnriched(retInserted.id);
    const clean = parseJSONFields(primaryEnriched);
    const returnClean = parseJSONFields(returnEnriched);

    await pool.query("COMMIT");

    // return { booking: [primary, retInserted] };
    return { bookings: [clean, returnClean] };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

// RETURN WAY BOOKING (Journey Type = 3)

async function createReturnWayBooking(payload) {
  try {
    await pool.query("BEGIN");

    /* ---------------- CUSTOMER ---------------- */
    let customerId = payload.customer_id || null;
    const c = payload.customer?.[0] || payload.customer;

    if (!customerId && c) {
      const res = await pool.query(
        `INSERT INTO customers (name,email,mobile,telephone,blacklist)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email)
         DO UPDATE SET mobile = EXCLUDED.mobile
         RETURNING id`,
        [
          c.name || payload.name,
          c.email || payload.email,
          c.mobile || payload.mobile,
          c.telephone || payload.telephone,
          c.blacklist || false,
        ],
      );
      customerId = res.rows[0].id;
    }

    /* ---------------- OUTBOUND ---------------- */
    const outbound = await normalizeBookingPayload({
      ...payload,
      journey_type_id: 3,
    });

    outbound.customer_id = customerId;
    outbound.reference_number = await genRef();

    const outboundInserted = await createBookingRow(pool, outbound);

    /* ---------------- RETURN ---------------- */
    const returnPayload = {
      ...payload,

      pickup: payload.return_pickup,
      dropoff: payload.return_dropoff,
      pickup_latitude: payload.return_pickup_latitude,
      pickup_longitude: payload.return_pickup_longitude,
      dropoff_latitude: payload.return_dropoff_latitude,
      dropoff_longitude: payload.return_dropoff_longitude,
      pickup_date: payload.return_pickup_date,
      pickup_time: payload.return_pickup_time,

      pickup_door_number: payload.return_pickup_door_number,
      dropoff_door_number: payload.return_dropoff_door_number,

      pickup_plot: payload.return_pickup_plot,
      dropoff_plot: payload.return_dropoff_plot,

      pickup_location_type_id: payload.return_pickup_location_type_id,
      dropoff_location_type_id: payload.return_dropoff_location_type_id,

      viapoints: payload.return_viapoints || [],
      notes: payload.return_notes || [],
      special_instructions: payload.return_special_instructions,

      fares: payload.return_fares,
      company_price: payload.return_company_price,
      waiting_charges: payload.return_waiting_charges,
      parking_charges: payload.return_parking_charges,
      congestion_charges: payload.return_congestion_charges,
      extra_drop_charges: payload.return_extra_drop_charges,
      meet_and_greet: payload.return_meet_and_greet,

      vehicle_type_id: payload.return_vehicle_type_id,
      driver_id: payload.return_driver_id,
      associated_booking: outboundInserted.id,
      journey_type_id: 3,
    };

    const normalizedReturn = await normalizeBookingPayload(returnPayload);
    normalizedReturn.customer_id = customerId;
    normalizedReturn.reference_number = await genRef();

    const returnInserted = await createBookingRow(pool, normalizedReturn);

    /* ---------------- ENRICHED ---------------- */
    const outboundEnriched = parseJSONFields(
      await getBookingByIdEnriched(outboundInserted.id),
    );
    const returnEnriched = parseJSONFields(
      await getBookingByIdEnriched(returnInserted.id),
    );

    await pool.query("COMMIT");

    return {
      bookings: [outboundEnriched],
      return_booking: [returnEnriched],
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

// MULTI VEHICLE booking

async function createMultiVehicleBooking(payload) {
  try {
    await pool.query("BEGIN");

    // -----------------------------
    // CREATE / FETCH CUSTOMER
    // -----------------------------
    let customerId = payload.customer_id || null;

    if (!customerId && payload.customer) {
      const c = payload.customer[0] || payload.customer;

      const res = await pool.query(
        `INSERT INTO customers (name,email,mobile,telephone,blacklist)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email)
         DO UPDATE SET mobile = EXCLUDED.mobile
         RETURNING id`,
        [
          c.name || payload.name,
          c.email || payload.email,
          c.mobile || payload.mobile,
          c.telephone || payload.telephone,
          c.blacklist || false,
        ],
      );

      customerId = res.rows[0].id;
    }

    // -----------------------------
    // INSERT BOOKINGS PER VEHICLE
    // -----------------------------
    const createdBookingIds = [];

    for (const vehicle of payload.multi_vehicle) {
      if (vehicle.exclude === true) continue;

      const bookingRow = {
        ...payload,
        vehicle_type_id: vehicle.vehicle_type,
      };

      // Remove non-DB fields
      delete bookingRow.multi_vehicle;
      delete bookingRow.multi_reservation;

      // Normalize payload
      const normalized = await normalizeBookingPayload(bookingRow);

      normalized.customer_id = customerId;
      normalized.reference_number = await genRef();

      // INSERT
      const inserted = await createBookingRow(pool, normalized);
      createdBookingIds.push(inserted.id);
    }

    // -----------------------------
    // FETCH ENRICHED BOOKINGS
    // -----------------------------
    const enrichedBookings = [];

    for (const id of createdBookingIds) {
      const res = await getBookingByIdEnriched(id);
      const parsed = parseJSONFields(res);
      enrichedBookings.push(parsed);
    }

    await pool.query("COMMIT");

    return {
      status: true,
      bookings: enrichedBookings,
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

async function createMultiBookings(payload) {
  return createMultiVehicleBooking(payload);
}

// NEW: MULTI RESERVATION BOOKING

// async function createMultiReservationBooking(payload) {
//   try {
//     await pool.query("BEGIN");

//     // -----------------------------
//     // CREATE / FETCH CUSTOMER
//     // -----------------------------
//     const customerPayload = payload.customer?.[0] || payload.customer;
//     let customerId = payload.customer_id || null;

//     if (!customerId && customerPayload) {
//       const res = await pool.query(
//         `INSERT INTO customers (name,email,mobile,telephone,blacklist)
//          VALUES ($1,$2,$3,$4,$5)
//          ON CONFLICT (email)
//          DO UPDATE SET mobile = EXCLUDED.mobile
//          RETURNING id`,
//         [
//           customerPayload.name || payload.name,
//           customerPayload.email || payload.email,
//           customerPayload.mobile || payload.mobile,
//           customerPayload.telephone || payload.telephone,
//           customerPayload.blacklist || false,
//         ]
//       );
//       customerId = res.rows[0].id;
//     }

//     // -----------------------------
//     // GENERATE MULTI BOOKING ID
//     // -----------------------------
//     const multiBookingIdRes = await pool.query(
//       "SELECT nextval('bookings_id_seq') AS nextid"
//     );
//     const multiBookingId = parseInt(multiBookingIdRes.rows[0].nextid, 10);

//     // -----------------------------
//     // INSERT BOOKINGS
//     // -----------------------------
//     const createdBookingIds = [];

//     for (const mr of payload.multi_reservation) {
//       if (mr.exclude === true) continue;

//       const clone = { ...payload };

//       clone.pickup_date = mr.pickup_date;
//       clone.pickup_time = mr.pickup_time;

//       //Fare For Every Booking
//       clone.fares = mr.total_fare;
//       clone.total_charges = mr.total_fare;

//       // Remove non-DB fields
//       delete clone.multi_reservation;
//       delete clone.multi_vehicle;

//       const normalized = await normalizeBookingPayload(clone);

//       normalized.customer_id = customerId;
//       normalized.multi_booking_id = multiBookingId;
//       normalized.reference_number = await genRef();

//       const inserted = await createBookingRow(pool, normalized);
//       createdBookingIds.push(inserted.id);
//     }

//     // -----------------------------
//     // FETCH ENRICHED BOOKINGS
//     // -----------------------------
//     const enrichedBookings = [];

//     for (const id of createdBookingIds) {
//       const res = await getBookingByIdEnriched(id);
//       const parsed = parseJSONFields(res);
//       enrichedBookings.push(parsed);
//     }

//     await pool.query("COMMIT");

//     return {
//       status: true,
//       bookings: enrichedBookings,
//       multi_booking_id: multiBookingId,
//     };
//   } catch (err) {
//     await pool.query("ROLLBACK");
//     throw err;
//   }
// }

// MULTI RESERVATION WITH RETURN WAY BOOKING
async function createMultiReservationBooking(payload) {
  try {
    await pool.query("BEGIN");

    /* -----------------------------
     * CREATE / FETCH CUSTOMER
     * ----------------------------- */
    const customerPayload = payload.customer?.[0] || payload.customer;
    let customerId = payload.customer_id || null;

    if (!customerId && customerPayload) {
      const res = await pool.query(
        `INSERT INTO customers (name,email,mobile,telephone,blacklist)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email)
         DO UPDATE SET mobile = EXCLUDED.mobile
         RETURNING id`,
        [
          customerPayload.name || payload.name,
          customerPayload.email || payload.email,
          customerPayload.mobile || payload.mobile,
          customerPayload.telephone || payload.telephone,
          customerPayload.blacklist || false,
        ],
      );
      customerId = res.rows[0].id;
    }

    /* -----------------------------
     * GENERATE MULTI BOOKING ID
     * ----------------------------- */
    const multiBookingIdRes = await pool.query(
      "SELECT nextval('bookings_id_seq') AS nextid",
    );
    const multiBookingId = parseInt(multiBookingIdRes.rows[0].nextid, 10);

    /* -----------------------------
     * INSERT BOOKINGS
     * ----------------------------- */
    const createdBookingIds = [];

    /* ==========================
     MULTI RESERVATION WITHOUT FARE
  ========================== */

    // for (const mr of payload.multi_reservation) {
    //   if (mr.exclude === true) continue;

    //   /* -------- OUTBOUND BOOKING -------- */
    //   const clone = { ...payload };

    //   clone.pickup = payload.pickup;
    //   clone.dropoff = payload.dropoff;

    //   clone.pickup_date = mr.pickup_date;
    //   clone.pickup_time = mr.pickup_time;

    //   // clone.fares = mr.total_fare;
    //   // clone.total_charges = mr.total_fare;

    //   delete clone.multi_reservation;
    //   delete clone.multi_vehicle;

    //   /* -------- CALCULATE FARE -------- */
    //   const fare = await calculateSingleFare({
    //     ...clone,
    //     pickup_date: mr.pickup_date,
    //     pickup_time: mr.pickup_time,
    //     journey_type_id: payload.journey_type_id,
    //   });

    //   clone.fares = fare.fare;
    //   clone.total_charges = fare.total_fare;

    //   const normalized = await normalizeBookingPayload(clone);

    //   normalized.customer_id = customerId;
    //   normalized.multi_booking_id = multiBookingId;
    //   normalized.reference_number = await genRef();

    //   const outboundInserted = await createBookingRow(pool, normalized);
    //   createdBookingIds.push(outboundInserted.id);

    //   /* -------- RETURN BOOKING (CONDITIONAL) -------- */
    //   const shouldCreateReturn =
    //     Number(payload.journey_type_id) === 3 && mr.return_pickup_time;

    //   if (shouldCreateReturn) {
    //     if (!payload.return_pickup || !payload.return_dropoff) {
    //       throw new Error(
    //         "return_pickup and return_dropoff are required for return journey",
    //       );
    //     }

    //     const returnClone = {
    //       ...normalized,

    //       pickup: payload.return_pickup,
    //       dropoff: payload.return_dropoff,

    //       pickup_date: mr.pickup_date,
    //       pickup_time: mr.return_pickup_time,

    //       associated_booking: outboundInserted.id,
    //       journey_type_id: 3,

    //       driver_id: null,
    //       vehicle_id: null,

    //       reference_number: await genRef(),
    //     };

    //     const returnInserted = await createBookingRow(pool, returnClone);
    //     createdBookingIds.push(returnInserted.id);
    //   }
    // }

    /* ==========================
     MULTI RESERVATION WITHOUT FARE
  ========================== */
    for (const mr of payload.multi_reservation) {
      if (mr.exclude === true) continue;

      /* ==========================
     OUTBOUND BOOKING
  ========================== */

      const outboundClone = { ...payload };

      outboundClone.pickup = payload.pickup;
      outboundClone.dropoff = payload.dropoff;

      outboundClone.pickup_date = mr.pickup_date;
      outboundClone.pickup_time = mr.pickup_time;

      delete outboundClone.multi_reservation;
      delete outboundClone.multi_vehicle;

      /* ---- CALCULATE OUTBOUND FARE ---- */
      const outboundFare = await calculateSingleFare({
        ...outboundClone,
        pickup_date: mr.pickup_date,
        pickup_time: mr.pickup_time,
        journey_type_id: 3,
      });

      outboundClone.fares = outboundFare.fare;
      outboundClone.total_charges = outboundFare.total_fare;

      const normalizedOutbound = await normalizeBookingPayload(outboundClone);

      normalizedOutbound.customer_id = customerId;
      normalizedOutbound.multi_booking_id = multiBookingId;
      normalizedOutbound.reference_number = await genRef();

      const outboundInserted = await createBookingRow(pool, normalizedOutbound);

      createdBookingIds.push(outboundInserted.id);

      /* ==========================
     RETURN BOOKING
  ========================== */

      const shouldCreateReturn =
        Number(payload.journey_type_id) === 3 && mr.return_pickup_time;

      if (shouldCreateReturn) {
        const returnClone = {
          ...payload,

          pickup: payload.return_pickup,
          dropoff: payload.return_dropoff,

          pickup_date: mr.pickup_date,
          pickup_time: mr.return_pickup_time,

          pickup_plot_id: payload.return_pickup_plot_id,
          dropoff_plot_id: payload.return_dropoff_plot_id,

          vehicle_type_id:
            payload.return_vehicle_type_id || payload.vehicle_type_id,

          associated_booking: outboundInserted.id,
          journey_type_id: 3,
        };

        delete returnClone.multi_reservation;
        delete returnClone.multi_vehicle;

        /* ---- CALCULATE RETURN FARE ---- */
        const returnFare = await calculateSingleFare({
          ...returnClone,
          pickup_date: mr.pickup_date,
          pickup_time: mr.return_pickup_time,
          journey_type_id: 1,
        });

        returnClone.fares = returnFare.fare;
        returnClone.total_charges = returnFare.total_fare;

        const normalizedReturn = await normalizeBookingPayload(returnClone);

        normalizedReturn.customer_id = customerId;
        normalizedReturn.multi_booking_id = multiBookingId;
        normalizedReturn.reference_number = await genRef();

        const returnInserted = await createBookingRow(pool, normalizedReturn);

        createdBookingIds.push(returnInserted.id);
      }
    }

    /* -----------------------------
     * FETCH ENRICHED BOOKINGS
     * ----------------------------- */
    const enrichedBookings = [];

    for (const id of createdBookingIds) {
      const res = await getBookingByIdEnriched(id);
      enrichedBookings.push(parseJSONFields(res));
    }

    await pool.query("COMMIT");

    return {
      status: true,
      bookings: enrichedBookings,
    };
  } catch (err) {
    await pool.query("ROLLBACK");
    throw err;
  }
}

// MAIN CONTROLLER

async function create(payload) {
  // Force parse multi_reservation if string
  if (typeof payload.multi_reservation === "string") {
    try {
      payload.multi_reservation = JSON.parse(payload.multi_reservation);
    } catch {
      payload.multi_reservation = [];
    }
  }

  // Force parse multi_vehicle if it is coming as string
  if (typeof payload.multi_vehicle === "string") {
    try {
      payload.multi_vehicle = JSON.parse(payload.multi_vehicle);
    } catch {
      payload.multi_vehicle = [];
    }
  }

  // -------------------------
  // MULTI RESERVATION
  // -------------------------
  if (
    Array.isArray(payload.multi_reservation) &&
    payload.multi_reservation.length > 0
  ) {
    payload.multi_reservation = payload.multi_reservation.filter(
      (b) => !b.exclude,
    );

    if (payload.multi_reservation.length === 0)
      throw new Error("All multi reservations excluded — nothing to insert.");

    return createMultiReservationBooking(payload);
  }

  // -------------------------
  // MULTI VEHICLE
  // -------------------------
  if (
    Array.isArray(payload.multi_vehicle) &&
    payload.multi_vehicle.length > 0
  ) {
    payload.multi_vehicle = payload.multi_vehicle.filter((v) => !v.exclude);

    if (payload.multi_vehicle.length === 0)
      throw new Error("All vehicles excluded — nothing to insert.");

    return createMultiVehicleBooking(payload);
  }

  // -------------------------
  // MULTI BOOKINGS (OLD)
  // -------------------------
  if (Array.isArray(payload.booking) && payload.booking.length > 0) {
    if (payload.booking_type_id === 2 || payload.booking_type_id == "2") {
      return createMultiBookings(payload);
    } else {
      return createMultiVehicleBooking(payload);
    }
  }
  // -------------------------
  // RETURN WAY (Journey Type = 3)
  // -------------------------
  if (payload.journey_type_id === 3 || payload.journey_type_id == "3") {
    return createReturnWayBooking(payload);
  }

  // Two-way
  if (payload.journey_type_id === 2 || payload.journey_type_id == "2") {
    return createSimpleBooking(payload);
  }

  // Simple
  return createSimpleBooking(payload);
}

async function updateBookingService(bookingId, payload) {
  //  COMPLETED STATUS
  const COMPLETED_STATUS_ID = 11;

  // 0️ Existing booking fetch
  const existing = await findBookingsById(bookingId);
  if (!existing) return null;

  const isCompleted =
    Number(existing.booking_status_id) === COMPLETED_STATUS_ID;

  // 1 Allowed columns (UPDATE ke liye)
  // const allowed = [
  //   "booking_status_id",
  //   "driver_id",
  //   "vehicle_id",
  //   "pickup",
  //   "dropoff",
  //   "pickup_date",
  //   "pickup_time",
  //   "dropoff_date",
  //   "dropoff_time",
  //   "pickup_latitude",
  //   "pickup_longitude",
  //   "dropoff_latitude",
  //   "dropoff_longitude",
  //   "pickup_door_number",
  //   "dropoff_door_number",
  //   "pickup_plot",
  //   "drpoff_plot",
  //   "notes",
  //   "viapoints",
  //   "restricted_drivers",
  //   "child_seat",
  //   "fares",
  //   "total_charges",
  //   "waiting_charges",
  //   "parking_charges",
  //   "extra_drop_charges",
  //   "payment_type_id",
  //   "account_id",
  //   "on_route",
  //   "arrived",
  //   "passenger_on_board",
  //   "completed",
  //   "cancelled_reason",
  //   "dispatch",
  //   "dispatch_as",
  //   "department",
  //   "passengers",
  //   "luggages",
  //   "hand_luggages"
  // ];

  // ALL FILEDS ALLOWED
  const allowed = [
    // Booking operational
    "booking_status_id",
    "driver_id",
    "vehicle_id",
    "vehicle_type_id",
    "pickup",
    "dropoff",
    "pickup_date",
    "pickup_time",
    "dropoff_date",
    "dropoff_time",
    "pickup_latitude",
    "pickup_longitude",
    "dropoff_latitude",
    "dropoff_longitude",
    "pickup_door_number",
    "dropoff_door_number",
    "pickup_plot",
    "dropoff_plot",
    "viapoints",
    "restricted_drivers",
    "child_seat",
    "notes",
    "special_instructions",
    "fares",
    "total_charges",
    "waiting_charges",
    "parking_charges",
    "extra_drop_charges",
    "congestion_charges",
    "credit_card_charges",
    "company_price",
    "eta",
    "miles",
    "payment_type_id",
    "account_id",
    "on_route",
    "arrived",
    "passenger_on_board",
    "completed",
    "cancelled_reason",
    "dispatch",
    "dispatch_as",

    // Passenger / booking info
    "passengers",
    "luggages",
    "hand_luggages",
    "name",
    "email",
    "mobile",
    "telephone",
    "department",
    "journey_type_id",
    "booking_type_id",
    "booking_source",
    "quotation",
    "sms",
    "emailFlag",
    "escort_id",
    "meet_and_greet",
    "add_return_fare",
    "fare_meter_status",
    "fare_meter",
    "toggle_driver_text",
    "toggle_passenger_text",
    "permanent",
    "multi_booking_id",
    "associated_booking",
    "invoice_status",
    "commission_status",
    "commission",
    "skipped_bookings",
    "booked_by",
    "booked_at",
    "stripe_customer_id",
    "stripe_payment_id",
    "invoice_number",
    "initial_subsidiary_id",
    "lead_time",
  ];

  // 2️ Filter payload
  const updates = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) {
      updates[key] = payload[key];
    }
  }

  // 3️ JSON stringify
  const jsonFields = ["viapoints", "restricted_drivers", "child_seat", "notes"];
  for (const f of jsonFields) {
    if (updates[f] !== undefined) {
      updates[f] =
        typeof updates[f] === "string"
          ? updates[f]
          : JSON.stringify(updates[f]);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new Error("No valid fields provided for update");
  }

  // =====================================================
  //  CASE 1: BOOKING NOT COMPLETED → NORMAL UPDATE
  // =====================================================
  if (!isCompleted) {
    const oldDriverId = existing.driver_id;
    const updated = await updateBooking(bookingId, updates);
    if (!updated) return null;

    const enriched = await getBookingByIdEnriched(updated.id);
    const clean = parseJSONFields(enriched);
    // 🔔 SEND NOTIFICATION IF DRIVER ASSIGNED / CHANGED
    if (
      updates.driver_id &&
      Number(updates.driver_id) !== Number(oldDriverId)
    ) {
      await sendBookingNotification(updates.driver_id, clean);
    }

    return clean;
  }

  // =====================================================
  //  CASE 2: BOOKING COMPLETED → CREATE NEW BOOKING
  // =====================================================
  const newBookingPayload = {
    ...existing,
    ...updates,

    id: undefined,
    booking_status_id: payload.booking_status_id || 1, // Saved / Pending
    completed: false,
    reference_number: await genRef(),
    created_at: new Date(),
    updated_at: new Date(),
  };

  //  Remove non-insertable fields
  delete newBookingPayload.id;

  // Normalize JSON fields again
  const normalized = await normalizeBookingPayload(newBookingPayload);

  const inserted = await createBookingRow(pool, normalized);

  const enriched = await getBookingByIdEnriched(inserted.id);
  const clean = parseJSONFields(enriched);

  // 8️ SEND NOTIFICATION
  if (clean.driver_id) {
    await sendBookingNotification(clean.driver_id, clean);
  }

  return clean;
}

async function cloneOneWayBookingService(payload) {
  const { booking_id, vehicle_type_id, pickup_date, pickup_time, driver_id } =
    payload;

  // 1️ Fetch existing booking
  const existing = await findBookingsById(booking_id);
  if (!existing) {
    throw new Error("Original booking not found");
  }

  // 2️ Prepare new booking object
  const newBooking = {
    ...existing,
    id: undefined,
    reference_number: await genRef(),
    journey_type_id: 1, // FORCE ONE WAY
    vehicle_type_id,
    pickup_date,
    pickup_time,
    driver_id: driver_id || null,
    booking_status_id: 1,
    completed: false,
    on_route: false,
    arrived: false,
    passenger_on_board: false,
    associated_booking: null,
    multi_booking_id: 0,
    created_at: new Date(),
    updated_at: new Date(),
  };

  delete newBooking.id;

  // 3️ Normalize payload
  const normalized = await normalizeBookingPayload(newBooking);

  // 4️ Insert booking
  const inserted = await createBookingRow(pool, normalized);

  // 5️ Calculate fare
  const farePayload = {
    ...normalized,
    booking_id: inserted.id,
    miles: payload.miles || 0,
    parking_charges: payload.parking_charges || 0,
    congestion_charges: payload.congestion_charges || 0,
    meet_and_greet: payload.meet_and_greet || 0,
    waiting_charges: payload.waiting_charges || 0,
    extra_drop_charges: payload.extra_drop_charges || 0,
    credit_card_charges: payload.credit_card_charges || 0,
    company_price: payload.company_price || 0,
  };

  const fare = await calculateSingleFare(farePayload);

  // Update booking
  await pool.query(`UPDATE bookings SET total_charges = $1 WHERE id = $2`, [
    fare.total_fare,
    inserted.id,
  ]);

  // 7️ Enrich & return
  const enriched = await getBookingByIdEnriched(inserted.id);
  const clean = parseJSONFields(enriched);

  // 8️ SEND NOTIFICATION
  if (clean.driver_id) {
    await sendBookingNotification(clean.driver_id, clean);
  }

  return clean;
}

async function assignDriverService(bookingId, driverId) {
  // 1️ Update booking with driver
  const updated = await updateBooking(bookingId, {
    driver_id: driverId,
    booking_status_id: 1,
  });

  if (!updated) return null;

  // 2️ Get enriched booking
  const enriched = await getBookingByIdEnriched(bookingId);

  // 3️ Send notification to driver
  await sendBookingNotification(driverId, enriched);

  return enriched;
}

// EXPORTS
module.exports = {
  create,
  genRef,
  normalizeBookingPayload,
  updateBookingService,
  assignDriverService,
  cloneOneWayBookingService,
};
