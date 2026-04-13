const FareConfiguration = require("../models/fareConfigurationModel");
const FareMeter = require("../models/fareMeterModel");
const VehicleType = require("../models/vehicleTypeModel");

// 🔥 Helpers
const getDayIndex = (day) => {
  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days.indexOf((day || "").toLowerCase().trim());
};

const isDayInRange = (fromDay, toDay, currentDay) => {
  const from = getDayIndex(fromDay);
  const to = getDayIndex(toDay);
  const current = getDayIndex(currentDay);

  if (from === -1 || to === -1 || current === -1) return false;

  if (from <= to) {
    return current >= from && current <= to;
  } else {
    // wrap case (Fri → Mon)
    return current >= from || current <= to;
  }
};

const cleanTime = (t) => {
  if (!t) return "";
  return t.toString().trim().slice(0, 5); // HH:mm
};

const isTimeInRange = (fromTime, toTime, currentTime) => {
  const from = cleanTime(fromTime);
  const to = cleanTime(toTime);
  const current = currentTime;

  if (!from || !to) return false;

  if (from <= to) {
    return current >= from && current <= to;
  } else {
    // overnight case
    return current >= from || current <= to;
  }
};

exports.getByVehicleType = async (req, res) => {
  try {
    const { vehicle_type_id } = req.query;

    // 🔴 Validation
    if (!vehicle_type_id) {
      return res.status(400).json({
        success: false,
        message: "vehicle_type_id is required in query",
      });
    }

    const vehicleExists = await VehicleType.exists(vehicle_type_id);

    if (!vehicleExists) {
      return res.status(404).json({
        success: false,
        message: "Vehicle type not found",
      });
    }

    // 🔥 CURRENT DAY & TIME
    const now = new Date();
    const currentDay = now.toLocaleString("en-US", { weekday: "long" });
    const currentTime = now.toTimeString().slice(0, 5);

    // 🔹 1. Get ALL fare configs
    const allConfigs =
      await FareConfiguration.getByVehicleTypeId(vehicle_type_id);

    // 🔥 FILTER FARE CONFIGS
    const filteredConfigs = allConfigs.filter((f) => {
      const dayMatch = isDayInRange(f.from_day, f.to_day, currentDay);

      const timeMatch = isTimeInRange(f.from_time, f.to_time, currentTime);

      return dayMatch && timeMatch;
    });

    // 🔹 2. Get fare meters
    const meterResult = await FareMeter.getByVehicleTypeId(vehicle_type_id);

    // 🔥 FILTER WAITING CHARGES
    // 🔥 FILTER WAITING CHARGES
const filteredMeters = meterResult.rows.map((meter) => {
  const filteredCharges = (meter.waiting_charges || [])
    .filter((wc) => {
      const dayMatch =
        wc.day && wc.day.toLowerCase().trim() === currentDay.toLowerCase();

      const timeMatch = isTimeInRange(wc.from_time, wc.to_time, currentTime);

      return dayMatch && timeMatch;
    })
    .map((wc) => ({
      ...wc,
      charge: (Number(wc.charge) / 100).toFixed(2), // 🔥 UPDATED HERE
    }));

  return {
    ...meter,
    waiting_charges: filteredCharges,
  };
});

    // ✅ RESPONSE
    return res.status(200).json({
      success: true,
      vehicle_type_id,
      currentDay,
      currentTime,
      data: {
        fare_configurations: filteredConfigs,
        fare_meter: filteredMeters,
      },
    });
  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
