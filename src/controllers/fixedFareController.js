const FixedFare = require("../models/fixedFareModel");


exports.createFixedFares = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD FIXED FARES BODY:",
      JSON.stringify(req.body, null, 2)
    );

    let data = req.body;

    // Agar stringified JSON aaye
    if (typeof data.area1 === "string" && data.area1.startsWith("[")) {
      data.area1 = JSON.parse(data.area1);
    }

    if (typeof data.area2 === "string" && data.area2.startsWith("[")) {
      data.area2 = JSON.parse(data.area2);
    }

    // Ensure arrays
    const area1Array = Array.isArray(data.area1)
      ? data.area1
      : [data.area1];

    const area2Array = Array.isArray(data.area2)
      ? data.area2
      : [data.area2];

    const finalPayload = [];

    // 🔥 Cartesian Product Logic
    for (const a1 of area1Array) {
      for (const a2 of area2Array) {
        finalPayload.push({
          vehicle_type_id: data.vehicle_type_id,
          area1: typeof a1 === "object" ? Object.values(a1)[0] : a1,
          area2: typeof a2 === "object" ? Object.values(a2)[0] : a2,
          fares: data.fares,
          from_location_id: data.from_location_id,
          to_location_id: data.to_location_id,
        });
      }
    }

    const newFares = await FixedFare.create(finalPayload);

    res.json({
      status: true,
      message: "Fixed Fare Created Successfully",
      fixed_fare: newFares,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      error: err.message,
    });
  }
};

exports.getAllFixedFares = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      vehicle_type_name,
      fares,
      area1,
      area2
    } = req.query;

    const offset = (page - 1) * limit;

    const result = await FixedFare.getAll({
      offset: Number(offset),
      limit: Number(limit),
      vehicle_type_name,
      fares,
      area1,
      area2
    });

    const totalPages = Math.ceil(result.totalRecords / limit);

    res.json({
      status: true,
      total_records: result.totalRecords,
      total_pages: totalPages,
      current_page: Number(page),
      limit: Number(limit),
      has_next: Number(page) < totalPages,
      has_prev: Number(page) > 1,
      fixed_fares: result.rows
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message
    });
  }
};

exports.getFixedFareById = async (req, res) => {
  try {
    const { id } = req.query;
    const fare = await FixedFare.getById(id);
    if (!fare)
      return res
        .status(404)
        .json({ status: false, message: "Fixed fare not found" });
    res.json({ status: true, fixed_fare: fare });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.updateFixedFare = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    console.log(
      "🚀 INCOMING FIXED FARE UPDATE BODY:",
      JSON.stringify(req.params, null, 2),
    );
    console.log(
      "🚀 INCOMING FIXED FARE UPDATE BODY:",
      JSON.stringify(req.body, null, 2),
    );

    if (isNaN(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid ID",
      });
    }
    const updated = await FixedFare.update(id, req.body);
    if (!updated) {
      return res.status(404).json({
        status: false,
        message: "Fixed Fare not found",
      });
    }

    res.json({
      status: true,
      message: "Fixed Fare Updated Successfully",
      fixed_fare: updated,
    });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.deleteFixedFare = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await FixedFare.delete(id);

    if (!deleted) {
      // If no record was found to delete
      return res
        .status(404)
        .json({ status: false, message: "Fixed Fare Not Found" });
    }

    res.json({ status: true, message: "Fixed Fare Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};
