const CompanyVehicle = require("../models/companyVehicleModel");
const BASE_URL = process.env.BASE_URL || "http://192.168.110.5:5000/uploads/";

const create = async (req, res) => {
  try {
    // 🧹 Clean input
    Object.keys(req.body).forEach((k) => {
      if (req.body[k] === "") req.body[k] = null;
    });

    // 🖼️ File uploads
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const key = file.fieldname;
        req.body[key] = `${BASE_URL}${file.filename}`;
      });
    }

    // 🧩 Convert booleans
    req.body.assigned =
      req.body.assigned === "true" || req.body.assigned === true;
    req.body.company = req.body.company === "true" || req.body.company === true;

    // 🚫 Check duplicate vehicle_number
    if (req.body.vehicle_number) {
      const existing = await CompanyVehicle.findByVehicleNumber(
        req.body.vehicle_number
      );
      if (existing) {
        return res.status(400).json({
          status: false,
          message: `Vehicle number '${req.body.vehicle_number}' already exists.`,
        });
      }
    }
    console.log(
      "🚀 INCOMING COMPANY VEHICLE ADD BODY:",
      JSON.stringify(req.body, null, 2)
    );
    // ✅ Create new vehicle
    const vehicle = await CompanyVehicle.create(req.body);
    res.status(200).json({ status: true, vehicle });
  } catch (err) {
    // Handle duplicate key (if not caught above)
    if (err.code === "23505") {
      const field = err.detail?.match(/\((.*?)\)=/)?.[1] || "field";
      const value = err.detail?.match(/=\((.*?)\)/)?.[1] || "";
      return res.status(400).json({
        status: false,
        message: `Duplicate entry: ${field} '${value}' already exists.`,
      });
    }
    // PostgreSQL foreign key constraint error
    if (err.code === "23503") {
      return res.status(400).json({
        status: false,
        message:
          "Invalid foreign key reference — please check vehicle_type_id or related fields.",
        detail: err.detail,
      });
    }
    console.error("Error creating company vehicle:", err);
    res
      .status(500)
      .json({ status: false, message: "Error Creating Company Vehicle" });
  }
};

const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      owner,
      vehicle_number,
      vehicle_type,
      make,
      model,
      color,
    } = req.query;

    const { vehicles, total } = await CompanyVehicle.findAll({
      page: Number(page),
      limit: Number(limit),
      owner,
      vehicle_number,
      vehicle_type,
      make,
      model,
      color,
    });

    res.json({
      status: true,
      page: Number(page),
      total,
      total_pages: Math.ceil(total / limit),
      count: vehicles.length,
      vehicles,
    });
  } catch (err) {
    console.error("Error fetching company vehicles:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const getById = async (req, res) => {
  try {
    const vehicle = await CompanyVehicle.findById(req.params.id);
    if (!vehicle)
      return res.status(404).json({ status: false, message: "Not found" });
    res.json({ status: true, vehicle });
  } catch (err) {
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    Object.keys(req.body).forEach((k) => {
      if (req.body[k] === "") req.body[k] = null;
    });

    // File update
    if (req.files) {
      Object.keys(req.files).forEach((f) => {
        req.body[f] = `${BASE_URL}${req.files[f][0].filename}`;
      });
    }
    console.log(
      "🚀 INCOMING COMPANY VEHICLE UPDATE BODY:",
      JSON.stringify(req.body, null, 2)
    );
    const updated = await CompanyVehicle.update(id, req.body);
    res.json({ status: true, vehicle: updated });
  } catch (err) {
    console.error("Error updating company vehicle:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const remove = async (req, res) => {
  try {
    const deleted = await CompanyVehicle.remove(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ status: false, message: "Company Vehicle not found" });
    res
      .status(200)
      .json({ status: true, message: "Company Vehicle Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

module.exports = { create, getAll, getById, update, remove };
