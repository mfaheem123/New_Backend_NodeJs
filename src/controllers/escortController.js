const Escort = require("../models/escortModel");
const BASE_URL = process.env.BASE_URL || "http://192.168.110.5:5000/uploads/";

const create = async (req, res) => {
  try {
    // Clean empty strings
    Object.keys(req.body).forEach((k) => {
      if (req.body[k] === "") req.body[k] = null;
    });

    // Handle uploads (image + documents)
    const fields = [
      "image",
      "safeguarding_document",
      "pat_document",
      "firstaid_document",
      "dbs_document",
    ];

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        const key = file.fieldname;
        if (fields.includes(key)) {
          req.body[key] = `${BASE_URL}${file.filename}`;
        }
      });
    }

    // Convert booleans if any
    req.body.active = req.body.active === "true" || req.body.active === true;
    console.log(
      "🚀 INCOMING ESCORT ADD BODY:",
      JSON.stringify(req.body, null, 2)
    );
    const escort = await Escort.create(req.body);
    res.status(200).json({ status: true, escort });
  } catch (err) {
    console.error("Error creating escort:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      name,
      safeguarding_expiry,
      pat_expiry,
      firstaid_expiry,
      dbs_expiry,
    } = req.query;

    const { escorts, total } = await Escort.findAll({
      page: Number(page),
      limit: Number(limit),
      name,
      safeguarding_expiry,
      pat_expiry,
      firstaid_expiry,
      dbs_expiry,
    });

    res.json({
      status: true,
      page: Number(page),
      total,
      total_pages: Math.ceil(total / limit),
      count: escorts.length,
      escorts,
    });
  } catch (err) {
    console.error("Error fetching escorts:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const getById = async (req, res) => {
  try {
    const escort = await Escort.findById(req.params.id);
    if (!escort)
      return res
        .status(404)
        .json({ status: false, message: "Escort not found" });
    res.json({ status: true, escort });
  } catch (err) {
    console.error("Error fetching escort by id:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    Object.keys(req.body).forEach((k) => {
      if (req.body[k] === "") req.body[k] = null;
    });

    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        req.body[file.fieldname] = `${BASE_URL}${file.filename}`;
      });
    }
    console.log(
      "🚀 INCOMING ESCORT UPDATE BODY:",
      JSON.stringify(req.body, null, 2)
    );
    const updated = await Escort.update(id, req.body);
    if (!updated)
      return res
        .status(404)
        .json({ status: false, message: "Escort not found" });

    res.json({ status: true, escort: updated });
  } catch (err) {
    console.error("Error updating escort:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

const remove = async (req, res) => {
  try {
    await Escort.remove(req.params.id);
    res.json({ status: true, message: "Escort deleted successfully" });
  } catch (err) {
    console.error("Error deleting escort:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

module.exports = { create, getAll, getById, update, remove };
