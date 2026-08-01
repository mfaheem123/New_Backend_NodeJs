const db = require("../db");

/* ---------------- HELPERS ---------------- */

const getApplicableFareIncrement = async (
  company_id,
  bookingDate,
  type // "fix_fare" | "mileage"
) => {
  const { rows } = await db.query(
    `
      SELECT *
      FROM fare_increments
      WHERE company_id=$1
      ORDER BY id DESC
    `,
    [company_id]
  );

  const booking = new Date(bookingDate);

  return rows.find((r) => {
    if (!r[type]) return false;

    const from = new Date(r.start_date);
    const to = new Date(r.end_date);

    return booking >= from && booking <= to;
  });
};

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const sumExtraCharges = (payload) => {
  const fields = [
    "parking_charges",
    "congestion_charges",
    "meet_and_greet",
    "waiting_charges",
    "extra_drop_charges",
    "credit_card_charges",
    "company_price",
  ];

  return fields.reduce((sum, key) => {
    const val = Number(payload[key] || 0);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
};

const getDayName = (date) =>
  new Date(date).toLocaleDateString("en-US", { weekday: "long" });

const normalizeTime = (time) => {
  if (!time) return null;
  const [h, m] = time.trim().split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
};

const timeToMinutes = (time) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const isTimeInRange = (current, from, to) => {
  const c = timeToMinutes(current);
  const f = timeToMinutes(from);
  const t = timeToMinutes(to);
  return f <= t ? c >= f && c <= t : c >= f || c <= t;
};

const isDayInRange = (current, from, to) => {
  const c = days.indexOf(current);
  const f = days.indexOf(from);
  const t = days.indexOf(to);
  return f <= t ? c >= f && c <= t : c >= f || c <= t;
};

const isDateInRange = (date, from, to) =>
  new Date(date) >= new Date(from) && new Date(date) <= new Date(to);

const normalize = (str = "") => str.toLowerCase().replace(/\s+/g, " ").trim();

/* ---------------- CACHE ---------------- */
const CACHE_TTL = 60 * 1000; // 1 minute

let fareByVehicleCache = {};

/* ---------------- FARE BY VEHICLE FUNCTION ---------------- */
const applyFareByVehicle = async (fare, vehicle_type_id, company_id) => {
  const now = Date.now();
  const cacheKey = `${company_id}_${vehicle_type_id}`;
  if (
    !fareByVehicleCache[cacheKey] ||
    now - fareByVehicleCache[cacheKey].timestamp > CACHE_TTL
  ) {
    const { rows } = await db.query(
      `SELECT * FROM fare_by_vehicles WHERE vehicle_type_id=$1 AND company_id=$2`,
      [vehicle_type_id, company_id],
    );

    fareByVehicleCache[cacheKey] = {
      data: rows,
      timestamp: now,
    };
  }

  const rows = fareByVehicleCache[cacheKey].data;

  if (!rows.length) return fare;

  let baseFare = fare;
  let totalAddition = 0;

  for (const r of rows) {
    const operator = (r.operator || "").toLowerCase();
    const value = Number(r.value || 0);

    if (operator === "percentage") {
      totalAddition += (baseFare * value) / 100;
    } else if (operator === "amount") {
      totalAddition += value;
    }
  }

  return baseFare + totalAddition;
};

/* ---------------- CORE FARE ---------------- */
const calculateSingleFare = async (payload) => {
  let {
    miles,
    pickup_date,
    pickup_time,
    vehicle_type_id,
    journey_type_id = 1,
    pickup_plot_id,
    dropoff_plot_id,
    pickup,
    dropoff,
    company_id,
  } = payload;

  // safe miles
  if (
    miles === undefined ||
    miles === null ||
    miles === "" ||
    isNaN(Number(miles))
  ) {
    return {
      fare: 0,
      total_fare: 0,
    };
  }

  miles = Number(miles);

  if (miles < 0) miles = 0;

  pickup_time = normalizeTime(pickup_time);
  const resolvedDay = getDayName(pickup_date);
  journey_type_id = Number(journey_type_id);

  // Only for FIXED / PLOT / AIRPORT
  const multiplier = journey_type_id === 2 ? 2 : 1;

  let baseFare = 0;
  let fareType = "NO_FARE";

  /* -------- FIXED -------- */
  if (pickup && dropoff) {
    const { rows } = await db.query(
      `SELECT * FROM fixed_fares WHERE vehicle_type_id=$1 AND company_id = $2`,
      [vehicle_type_id, company_id],
    );

    const p = normalize(pickup);
    const d = normalize(dropoff);

    const fixed = rows.find(
      (r) =>
        (p.includes(normalize(r.area1)) && d.includes(normalize(r.area2))) ||
        (p.includes(normalize(r.area2)) && d.includes(normalize(r.area1))),
    );

    if (fixed) {
      baseFare = Number(fixed.fares) * multiplier;
      fareType = "FIXED";
    }
  }

  /* -------- PLOT FARE -------- */
  if (!baseFare && pickup_plot_id && dropoff_plot_id) {
    const { rows } = await db.query(
      `SELECT * FROM plot_fares
       WHERE vehicle_type_id=$1
       AND pickup_plot_id=$2
       AND dropoff_plot_id=$3
       AND company_id = $4
       ORDER BY id DESC LIMIT 1`,
      [vehicle_type_id, pickup_plot_id, dropoff_plot_id, company_id],
    );

    if (rows.length) {
      baseFare = Number(rows[0].fares) * multiplier;
      fareType = "PLOT";
    }
  }

  /* -------- NORMAL / SPECIAL (NO MULTIPLIER) -------- */
  if (!baseFare) {
    const { rows } = await db.query(
      `SELECT * FROM fare_configurations
       WHERE vehicle_type_id=$1 AND company_id = $2
       ORDER BY id ASC`,
      [vehicle_type_id, company_id],
    );

    const rule =
      rows.find(
        (r) =>
          r.from_date && isDateInRange(pickup_date, r.from_date, r.to_date),
      ) ||
      rows.find(
        (r) =>
          !r.from_date &&
          isDayInRange(resolvedDay, r.from_day, r.to_day) &&
          isTimeInRange(pickup_time, r.from_time, r.to_time),
      );

    if (rule) {
      const minMiles = Number(rule.minimum_miles);
      const minFare = Number(rule.minimum_fares);
      const perMileFare = Number(rule.per_mile_fares || 0);

      let extraMiles = miles - minMiles;
      if (extraMiles < 0) extraMiles = 0;

      baseFare = minFare + extraMiles * perMileFare;
      fareType = rule.from_date ? "SPECIAL" : "NORMAL";
      console.log({
        vehicle_type_id,
        minimumFare: minFare,
        minimumMiles: minMiles,
        perMileFare,
        extraMiles,
        baseFare,
      });
    }
  }

  /* -------- FALLBACK DEFAULT -------- */
  if (!baseFare) {
    let extraMiles = miles - 0.9;
    if (extraMiles < 0) extraMiles = 0;

    baseFare = 0.0 + extraMiles * 2;
    fareType = "DEFAULT";
  }

  /* -------- AIRPORT CHARGES -------- */
  let airportPickup = 0;
  let airportDropoff = 0;

  const { rows: airports } = await db.query(
    `SELECT * FROM locations WHERE location_type_id=2 AND company_id =$1`,
    [company_id],
  );

  if (pickup) {
    const pickupText = normalize(pickup);

    const airport = airports.find((a) => {
      return (
        pickupText.includes(normalize(a.name || "")) ||
        pickupText.includes(normalize(a.postcode || "")) ||
        pickupText.includes(normalize(a.shortcut || "")) ||
        pickupText.includes(normalize(a.address || ""))
      );
    });

    if (airport) {
      airportPickup = Number(airport.pickup_charges || 0) * multiplier;
    }
  }

  if (dropoff) {
    const dropoffText = normalize(dropoff);

    const airport = airports.find((a) => {
      return (
        dropoffText.includes(normalize(a.name || "")) ||
        dropoffText.includes(normalize(a.postcode || "")) ||
        dropoffText.includes(normalize(a.shortcut || "")) ||
        dropoffText.includes(normalize(a.address || ""))
      );
    });

    if (airport) {
      airportDropoff = Number(airport.dropoff_charges || 0) * multiplier;
    }
  }

  /* -------- FARE BY VEHICLE CHARGES -------- */
  let vehicleAdjustedFare = await applyFareByVehicle(
    baseFare,
    vehicle_type_id,
    company_id,
  );

  /* -------- FARE INCREMENT CHARGES -------- */
let fareIncrementAmount = 0;
const increment = await getApplicableFareIncrement(
  company_id,
  pickup_date,
  "fix_fare"
);

if (increment) {
  const value = Number(increment.amount);

  if ((increment.operator || "").toLowerCase() === "percentage") {
    fareIncrementAmount  = (vehicleAdjustedFare * value) / 100;
  } else {
    fareIncrementAmount  = value;
  }
  vehicleAdjustedFare += fareIncrementAmount;
  console.log("============================== FARE INCREMENT APPLIED ==============================")
    console.log("Operator:", increment.operator);
  console.log("Increment Value:", value);
  console.log("Increment Applied:", fareIncrementAmount.toFixed(2));
}

  /* -------- EXTRA CHARGES -------- */
  const extraChargesTotal = sumExtraCharges(payload);

  const fareWithoutExtras =
    vehicleAdjustedFare + airportPickup + airportDropoff;

  const totalFare = fareWithoutExtras + extraChargesTotal;

  console.log("FARE CALCULATION DETAILS");
  console.log("fareType: ", fareType);
  console.log("baseFare: ", baseFare);
  console.log("vehicleAdjustedFare: ", vehicleAdjustedFare);
  console.log("airportPickup: ", airportPickup);
  console.log("airportDropoff: ", airportDropoff);
  console.log("extraChargesTotal: ", extraChargesTotal);
  console.log("totalFare: ", totalFare);

  return {
    fare: Number(fareWithoutExtras.toFixed(2)),
    total_fare: Number(totalFare.toFixed(2)),
  };
};

/* ---------------- CONTROLLER ---------------- */

// CALCULATE FARES WITH SINGLE VEHICLE
exports.calculateFare = async (req, res) => {
  try {
    let { multi_reservation, journey_type_id, company_id } = req.body;

    console.log(
      "🚀 INCOMING FARE CALCULATION BODY:",
      JSON.stringify(req.body, null, 2),
    );

    journey_type_id = Number(journey_type_id || 1);

    if (typeof multi_reservation === "string") {
      multi_reservation = JSON.parse(multi_reservation);
    }

    /* =========================
       RETURN WAY (journey_type_id = 3)
    ========================== */
    if (journey_type_id === 3) {
      const outboundFare = await calculateSingleFare({
        ...req.body,
        miles: req.body.miles,
        journey_type_id: 3,
      });

      const returnFare = await calculateSingleFare({
        ...req.body,

        // ✅ return specific
        miles: Number(req.body.return_miles),
        pickup: req.body.return_pickup,
        dropoff: req.body.return_dropoff,
        pickup_plot_id: req.body.return_pickup_plot_id,
        dropoff_plot_id: req.body.return_dropoff_plot_id,
        pickup_date: req.body.return_pickup_date || req.body.pickup_date,
        pickup_time: req.body.return_pickup_time || req.body.pickup_time,
        // vehicle_type_id: req.body.return_vehicle_type_id,
        vehicle_type_id:
          req.body.return_vehicle_type_id || req.body.vehicle_type_id,
        journey_type_id: 1,

        // outbound extra charges
        parking_charges: Number(req.body.return_parking_charges || 0),
        congestion_charges: Number(req.body.return_congestion_charges || 0),
        meet_and_greet: Number(req.body.return_meet_and_greet || 0),
        waiting_charges: Number(req.body.return_waiting_charges || 0),
        extra_drop_charges: Number(req.body.return_extra_drop_charges || 0),
        credit_card_charges: Number(req.body.return_credit_card_charges || 0),
        company_price: Number(req.body.return_company_price || 0),
      });

      return res.status(200).json({
        status: true,
        message: "Return Way Fares Calculated Successfully",
        data: {
          fare: outboundFare.total_fare,
          return_fare: returnFare.total_fare,
          total_fare: Number(
            (outboundFare.total_fare + returnFare.total_fare).toFixed(2),
          ),
        },
      });
    }

    /* =========================
       MULTI RESERVATION
    ========================== */
    if (Array.isArray(multi_reservation)) {
      const reservations = [];
      let grand_total = 0;

      for (const r of multi_reservation) {
        if (r.exclude) {
          reservations.push({
            pickup_date: r.pickup_date,
            pickup_time: r.pickup_time,
            exclude: true,
            total_fare: 0,
          });
          continue;
        }

        const fare = await calculateSingleFare({
          ...req.body,
          pickup_date: r.pickup_date,
          pickup_time: r.pickup_time,
        });

        reservations.push({
          pickup_date: r.pickup_date,
          pickup_time: r.pickup_time,
          exclude: false,
          ...fare,
        });

        grand_total += fare.total_fare;
      }

      return res.status(200).json({
        status: true,
        message: "Multi reservation fares calculated",
        data: {
          total_reservations: reservations.length,
          total_fare: Number(grand_total.toFixed(2)),
          multi_reservation: reservations,
        },
      });
    }

    /* =========================
       SINGLE BOOKING
    ========================== */
    const fare = await calculateSingleFare(req.body);

    return res.status(200).json({
      status: true,
      message: "Fare calculated successfully",
      data: fare,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

//CALCULATE FARES FOR ALL VEHICLES
exports.calculateFareAllVehicles = async (req, res) => {
  try {
    console.log(
      "🚀 CALCULATE ALL VEHICLES:",
      JSON.stringify(req.body, null, 2),
    );

    const { company_id } = req.body;

    if (!company_id) {
      return res.status(400).json({
        status: false,
        message: "company_id is required",
      });
    }

    // Get all vehicles
    const { rows: vehicles } = await db.query(
      `
      SELECT id, name
      FROM vehicle_types WHERE company_id = $1
      ORDER BY id
    `,
      [company_id],
    );

    if (!vehicles.length) {
      return res.status(404).json({
        status: false,
        message: "No vehicles found",
      });
    }

    const results = [];

    for (const vehicle of vehicles) {
      const fare = await calculateSingleFare({
        ...req.body,
        vehicle_type_id: vehicle.id,
      });

      results.push({
        vehicle_type_id: vehicle.id,
        vehicle_name: vehicle.name,
        fare: fare.fare,
        total_fare: fare.total_fare,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Fare calculated for all vehicles",
      count: results.length,
      data: results,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.calculateSingleFare = calculateSingleFare;
