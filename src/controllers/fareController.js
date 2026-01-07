const db = require("../db");

/* ---------------- HELPERS ---------------- */

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

/* ---------------- CORE FARE ---------------- */

const calculateSingleFare = async (payload) => {
  let {
    miles = 0,
    pickup_date,
    pickup_time,
    vehicle_type_id,
    journey_type_id = 1,
    pickup_plot_id,
    dropoff_plot_id,
    pickup,
    dropoff,
  } = payload;

  pickup_time = normalizeTime(pickup_time);
  const resolvedDay = getDayName(pickup_date);
  journey_type_id = Number(journey_type_id);

  // 🔁 only for FIXED / PLOT / AIRPORT
  const multiplier = journey_type_id === 2 ? 2 : 1;

  let baseFare = 0;
  let fareType = "NO_FARE";

  /* -------- FIXED -------- */
  if (pickup && dropoff) {
    const { rows } = await db.query(
      `SELECT * FROM fixed_fares WHERE vehicle_type_id=$1`,
      [vehicle_type_id]
    );

    const p = normalize(pickup);
    const d = normalize(dropoff);

    const fixed = rows.find(
      (r) =>
        (p.includes(normalize(r.area1)) && d.includes(normalize(r.area2))) ||
        (p.includes(normalize(r.area2)) && d.includes(normalize(r.area1)))
    );

    if (fixed) {
      baseFare = Number(fixed.fares) * multiplier;
      fareType = "FIXED";
    }
  }

  /* -------- PLOT -------- */
  if (!baseFare && pickup_plot_id && dropoff_plot_id) {
    const { rows } = await db.query(
      `SELECT * FROM plot_fares
       WHERE vehicle_type_id=$1
       AND pickup_plot_id=$2
       AND dropoff_plot_id=$3
       ORDER BY id DESC LIMIT 1`,
      [vehicle_type_id, pickup_plot_id, dropoff_plot_id]
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
       WHERE vehicle_type_id=$1
       ORDER BY id ASC`,
      [vehicle_type_id]
    );

    const rule =
      rows.find(
        (r) => r.from_date && isDateInRange(pickup_date, r.from_date, r.to_date)
      ) ||
      rows.find(
        (r) =>
          !r.from_date &&
          isDayInRange(resolvedDay, r.from_day, r.to_day) &&
          isTimeInRange(pickup_time, r.from_time, r.to_time)
      );

    if (rule) {
      const minMiles = Number(rule.minimum_miles);
      const minFare = Number(rule.minimum_fares);

      let extraMiles = miles - minMiles;
      if (extraMiles < 0) extraMiles = 0;

      baseFare = minFare + extraMiles * 2; // 👈 miles already doubled
      fareType = rule.from_date ? "SPECIAL" : "NORMAL";
    }
  }

  /* -------- AIRPORT -------- */
  let airportPickup = 0;
  let airportDropoff = 0;

  const { rows: airports } = await db.query(
    `SELECT * FROM locations WHERE location_type_id=2`
  );

  if (pickup) {
    const a = airports.find((x) =>
      normalize(pickup).includes(normalize(x.address))
    );
    if (a) airportPickup = Number(a.pickup_charges || 0) * multiplier;
  }

  if (dropoff) {
    const a = airports.find((x) =>
      normalize(dropoff).includes(normalize(x.address))
    );
    if (a) airportDropoff = Number(a.dropoff_charges || 0) * multiplier;
  }

  /* -------- EXTRA CHARGES (ALWAYS ADD) -------- */
  const extraChargesTotal = sumExtraCharges(payload);

  const totalFare =
    baseFare + airportPickup + airportDropoff + extraChargesTotal;

  return {
    total_fare: Number(totalFare.toFixed(2)),
  };
};

/* ---------------- CONTROLLER ---------------- */

exports.calculateFare = async (req, res) => {
  try {
    let { multi_reservation } = req.body;

    console.log(
      "🚀 INCOMING FARE CALCULATION BODY:",
      JSON.stringify(req.body, null, 2)
    );

    if (typeof multi_reservation === "string") {
      multi_reservation = JSON.parse(multi_reservation);
    }

    /* -------- MULTI -------- */
    if (Array.isArray(multi_reservation)) {
      const reservations = [];
      let grand_total = 0;

      for (const r of multi_reservation) {
        if (r.exclude) {
          reservations.push({
            pickup_date: r.pickup_date,
            pickup_time: r.pickup_time,
            excluded: true,
            fare: null,
          });
          continue;
        }

        const fare = await calculateSingleFare({
          ...req.body,
          pickup_date: r.pickup_date,
          pickup_time: r.pickup_time,
          day: r.day,
        });

        reservations.push({
          pickup_date: r.pickup_date,
          pickup_time: r.pickup_time,
          ...fare,
        });

        grand_total += fare.total_fare;
      }

      return res.json({
        status: true,
        message: "Multi reservation fares calculated",
        data: {
          total_reservations: reservations.length,
          grand_total: Number(grand_total.toFixed(2)),
          reservations,
        },
      });
    }

    /* -------- SINGLE -------- */
    const fare = await calculateSingleFare(req.body);

    return res.json({
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
