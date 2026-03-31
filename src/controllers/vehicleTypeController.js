const VehicleType = require("../models/vehicleTypeModel");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://192.168.110.5:5000/uploads/";

const getAll = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 100,
      name,
      passengers,
      luggages,
      hand_luggages,
      minimum_fares,
      minimum_miles,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    const { vehicle_types, total } = await VehicleType.getAll({
      offset,
      limit,
      filters: {
        name,
        passengers,
        luggages,
        hand_luggages,
        minimum_fares,
        minimum_miles,
      },
    });

    res.json({
      status: true,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      count: vehicle_types.length,
      vehicle_types,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const vehicle = await VehicleType.getById(req.params.id);
    if (!vehicle)
      return res
        .status(404)
        .json({ status: false, message: "Vehicle not found" });
    res.json({ status: true, vehicle });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const create = async (req, res) => {
  try {
    Object.keys(req.body).forEach((key) => {
      if (req.body[key] === "") req.body[key] = null;
    });

    // 🖼️ Image handling
    const imageUrl = req.file ? `${BASE_URL}${req.file.filename}` : null;
    req.body.image = imageUrl;

    // 🧮 Numeric fields
    const numericFields = [
      "passengers",
      "luggages",
      "hand_luggages",
      "minimum_fares",
      "minimum_miles",
      "driver_waiting_charges",
      "account_waiting_charges",
      "waiting_time",
    ];
    numericFields.forEach((f) => {
      if (req.body[f] !== null && req.body[f] !== undefined)
        req.body[f] = parseFloat(req.body[f]) || null;
    });

    // 🔘 Boolean fields
    const booleanFields = ["default_vehicle", "vehicle_type_minimum_fares"];
    booleanFields.forEach((f) => {
      if (req.body[f] === "true" || req.body[f] === true) req.body[f] = true;
      else req.body[f] = false;
    });

    // 🚫 Check duplicate name
    const existingVehicle = await VehicleType.findByName(req.body.name);
    if (existingVehicle) {
      return res.status(400).json({
        status: false,
        message: `Vehicle type "${req.body.name}" already exists.`,
      });
    }

    const newVehicle = await VehicleType.create(req.body);
    res.status(200).json({
      status: true,
      message: "Vehicle created successfully",
      vehicle_type: newVehicle,
    });
  } catch (err) {
    console.error("Error creating vehicle:", err);
    if (err.code === "23505") {
      return res.status(400).json({
        status: false,
        message: "Vehicle type name already exists.",
      });
    }
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;

    Object.keys(req.body).forEach((key) => {
      if (req.body[key] === "") req.body[key] = null;
    });

    const imageUrl = req.file ? `${BASE_URL}${req.file.filename}` : null;
    if (imageUrl) req.body.image = imageUrl;

    const numericFields = [
      "passengers",
      "luggages",
      "hand_luggages",
      "minimum_fares",
      "minimum_miles",
      "driver_waiting_charges",
      "account_waiting_charges",
      "waiting_time",
    ];
    numericFields.forEach((f) => {
      if (req.body[f] !== null && req.body[f] !== undefined)
        req.body[f] = parseFloat(req.body[f]) || null;
    });

    const booleanFields = ["default_vehicle", "vehicle_type_minimum_fares"];
    booleanFields.forEach((f) => {
      if (req.body[f] === "true" || req.body[f] === true) req.body[f] = true;
      else req.body[f] = false;
    });

    const updatedVehicle = await VehicleType.update(id, req.body);
    res.json({
      status: true,
      message: "Vehicle updated successfully",
      vehicle_type: updatedVehicle,
    });
  } catch (err) {
    console.error("Error updating vehicle:", err);
    res.status(500).json({ status: false, message: "Error updating vehicle" });
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await VehicleType.delete(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ status: false, message: "Vehicle not found" });

    res.json({ status: true, message: "Vehicle deleted successfully" });
  } catch (err) {
    console.error("Error deleting vehicle:", err);
    res.status(500).json({ status: false, message: "Error deleting vehicle" });
  }
};

module.exports = { getAll, getById, create, update, remove };
