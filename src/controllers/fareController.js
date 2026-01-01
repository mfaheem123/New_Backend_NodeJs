const db = require("../db");

/* -------------------- HELPERS -------------------- */

const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
  const f = timeToMinutes(from.trim());
  const t = timeToMinutes(to.trim());

  if (f <= t) return c >= f && c <= t;
  return c >= f || c <= t;
};

const isDayInRange = (current, from, to) => {
  const c = days.indexOf(current);
  const f = days.indexOf(from);
  const t = days.indexOf(to);

  if (f <= t) return c >= f && c <= t;
  return c >= f || c <= t;
};

const isDateInRange = (date, from, to) => {
  const d = new Date(date);
  return d >= new Date(from) && d <= new Date(to);
};

const normalize = (str = "") => str.toLowerCase().replace(/\s+/g, " ").trim();

/* -------------------- CONTROLLER -------------------- */

exports.calculateFare = async (req, res) => {
  try {
    let {
      miles,
      pickup_date,
      pickup_time,
      vehicle_type_id,
      day,
      pickup_plot_id,
      dropoff_plot_id,
      pickup,
      dropoff,
    } = req.body;

    console.log("🚀 FARE REQUEST:", req.body);

    if (!pickup_date || !pickup_time || !vehicle_type_id) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields",
      });
    }

    miles = Number(miles || 0);
    vehicle_type_id = Number(vehicle_type_id);
    pickup_plot_id = pickup_plot_id ? Number(pickup_plot_id) : null;
    dropoff_plot_id = dropoff_plot_id ? Number(dropoff_plot_id) : null;
    pickup_time = normalizeTime(pickup_time);
    const resolvedDay = day || getDayName(pickup_date);

    let totalFare = 0;
    let ruleApplied = null;

    /* ------------------------------------------------
       🥇 0️⃣ FIXED FARES (HIGHEST PRIORITY)
    ------------------------------------------------ */

    if (pickup && dropoff) {
      const { rows: fixedFares } = await db.query(
        `
        SELECT 
          f.*,
          vt.name AS vehicle_type_name
        FROM fixed_fares f
        JOIN vehicle_types vt ON vt.id = f.vehicle_type_id
        WHERE f.vehicle_type_id = $1
        ORDER BY f.id DESC
      `,
        [vehicle_type_id]
      );

      const pickupText = normalize(pickup);
      const dropoffText = normalize(dropoff);

      const match = fixedFares.find((ff) => {
        const a1 = normalize(ff.area1);
        const a2 = normalize(ff.area2);

        return (
          (pickupText.includes(a1) && dropoffText.includes(a2)) ||
          (pickupText.includes(a2) && dropoffText.includes(a1))
        );
      });

      if (match) {
        return res.status(200).json({
          status: true,
          message: "Fixed fare applied",
          data: {
            rule_applied: {
              type: "FIXED_FARE",
              vehicle_type: match.vehicle_type_name,
              area1: match.area1,
              area2: match.area2,
            },
            total_fare: Number(match.fares),
          },
        });
      }
    }

    /* ------------------------------------------------
       🥈 1️⃣ PLOT FARES
    ------------------------------------------------ */

    if (pickup_plot_id && dropoff_plot_id) {
      const { rows: plotFares } = await db.query(
        `
        SELECT 
          pf.*, 
          vt.name AS vehicle_type_name,
          p1.name AS pickup_plot_name,
          p2.name AS dropoff_plot_name
        FROM plot_fares pf
        JOIN vehicle_types vt ON vt.id = pf.vehicle_type_id
        JOIN zones p1 ON p1.id = pf.pickup_plot_id
        JOIN zones p2 ON p2.id = pf.dropoff_plot_id
        WHERE pf.vehicle_type_id = $1
          AND pf.pickup_plot_id = $2
          AND pf.dropoff_plot_id = $3
        ORDER BY pf.id DESC
        LIMIT 1
      `,
        [vehicle_type_id, pickup_plot_id, dropoff_plot_id]
      );

      if (plotFares.length) {
        const pf = plotFares[0];

        totalFare = Number(pf.fares);
        ruleApplied = {
          type: "PLOT_FARE",
          vehicle_type: pf.vehicle_type_name,
          pickup_plot: pf.pickup_plot_name,
          dropoff_plot: pf.dropoff_plot_name,
        };
      }
    }

    /* ------------------------------------------------
       🥉 2️⃣ NORMAL FARE CONFIG
    ------------------------------------------------ */

    if (!ruleApplied) {
      const { rows: fareConfigs } = await db.query(`
        SELECT 
          f.*, 
          vt.name AS vehicle_type_name,
          vt.minimum_fares AS vehicle_minimum_fare
        FROM fare_configurations f
        JOIN vehicle_types vt ON vt.id = f.vehicle_type_id
        ORDER BY f.id ASC
      `);

      let applied = fareConfigs.find(
        (fc) =>
          fc.vehicle_type_id === vehicle_type_id &&
          fc.from_date &&
          fc.to_date &&
          isDateInRange(pickup_date, fc.from_date, fc.to_date)
      );

      if (!applied) {
        applied = fareConfigs.find(
          (fc) =>
            fc.vehicle_type_id === vehicle_type_id &&
            !fc.from_date &&
            !fc.to_date &&
            isDayInRange(resolvedDay, fc.from_day, fc.to_day) &&
            isTimeInRange(pickup_time, fc.from_time, fc.to_time)
        );
      }

      if (!applied) {
        return res.status(404).json({
          status: false,
          message: "No fare rule matched for given inputs",
        });
      }

      const minMiles = Number(applied.minimum_miles);
      const minFare = Number(applied.minimum_fares);

      let chargeableMiles = miles - minMiles;
      if (chargeableMiles < 0) chargeableMiles = 0;

      const distanceFare = chargeableMiles * 2;
      totalFare = distanceFare + minFare;

      if (
        applied.vehicle_minimum_fare &&
        totalFare < applied.vehicle_minimum_fare
      ) {
        totalFare = applied.vehicle_minimum_fare;
      }

      ruleApplied = {
        type: applied.from_date ? "SPECIAL_DATE" : "DAY_TIME",
        vehicle_type: applied.vehicle_type_name,
        resolved_day: resolvedDay,
      };
    }

    /* ------------------------------------------------
       ✈️ 3️⃣ AIRPORT CHARGES
    ------------------------------------------------ */

    const { rows: airports } = await db.query(`
      SELECT *
      FROM locations
      WHERE location_type_id = 2
      ORDER BY id ASC
    `);

    let airportPickupCharge = 0;
    let airportDropoffCharge = 0;

    if (pickup) {
      const pickupText = normalize(pickup);
      const match = airports.find((a) =>
        pickupText.includes(normalize(a.address))
      );
      if (match) airportPickupCharge = Number(match.pickup_charges || 0);
    }

    if (dropoff) {
      const dropoffText = normalize(dropoff);
      const match = airports.find((a) =>
        dropoffText.includes(normalize(a.address))
      );
      if (match) airportDropoffCharge = Number(match.dropoff_charges || 0);
    }

    totalFare += airportPickupCharge + airportDropoffCharge;

    /* ------------------------------------------------
       ✅ RESPONSE
    ------------------------------------------------ */

    return res.status(200).json({
      status: true,
      message: "Fare calculated successfully",
      data: {
        rule_applied: ruleApplied,
        airport_charges: {
          pickup: airportPickupCharge,
          dropoff: airportDropoffCharge,
        },
        total_fare: Number(totalFare.toFixed(2)),
      },
    });
  } catch (err) {
    console.error("Fare Error:", err);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
