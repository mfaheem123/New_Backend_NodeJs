const Subs = require("../models/subsidiaryModel");
const SubsBank = require("../models/subsidiaryBankModel");

const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://192.168.110.5:5000/uploads/";

// 🔍 Basic validation
const validateSubsidiaryPayload = (payload) => {
  if (!payload) return "Empty payload";
  if (payload.name && typeof payload.name !== "string") return "Invalid name";
  if (payload.email && typeof payload.email !== "string")
    return "Invalid email";
  return null;
};

// 📋 Get all subsidiaries
const getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 100,
      name,
      email,
      telephone_number,
      fax,
      address,
    } = req.query;

    const { subsidiaries, total } = await Subs.getAll({
      page: Number(page),
      limit: Math.min(1000, Number(limit)),
      name,
      email,
      telephone_number,
      fax,
      address,
    });

    res.status(200).json({
      status: true,
      page: Number(page),
      limit: Math.min(1000, Number(limit)),
      total,
      total_pages: Math.ceil(total / limit),
      count: subsidiaries.length,
      subsidiaries,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// 📋 Get single subsidiary
const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const row = await Subs.getById(id);
    if (!row)
      return res
        .status(404)
        .json({ status: false, message: "Subsidiary not found" });
    res.json({ status: true, subsidiary: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// ➕ Create subsidiary
const create = async (req, res) => {
  try {
    const payload = req.body;
    console.log(
      "🚀 INCOMING SUBSIDIARY ADD BODY:",
      JSON.stringify(payload, null, 2)
    );

    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });

    const imageUrl = req.file ? `${BASE_URL}${req.file.filename}` : null;
    payload.logo = imageUrl;
    console.log("🚀 INCOMING SUBSIDIARY ADD LOGO URL:", imageUrl);
    const errMsg = validateSubsidiaryPayload(payload);
    if (errMsg) return res.status(400).json({ status: false, message: errMsg });

    // Step 1️⃣ - create subsidiary
    const created = await Subs.create(payload);

    // Step 2️⃣ - insert its bank details
    if (created && created.id) {
      await SubsBank.create(created.id, payload);
    }

    res.status(200).json({
      status: true,
      message: "Subsidiary created successfully",
      subsidiary: created,
    });
  } catch (err) {
    console.error("Error creating subsidiary:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// ✏️ Update subsidiary
const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const payload = req.body;

    Object.keys(payload).forEach((key) => {
      if (payload[key] === "") payload[key] = null;
    });

    // 🖼️ Update image if new one provided
    const imageUrl = req.file ? `${BASE_URL}${req.file.filename}` : null;
    if (imageUrl) payload.logo = imageUrl;

    const errMsg = validateSubsidiaryPayload(payload);
    if (errMsg) return res.status(400).json({ status: false, message: errMsg });

    const updated = await Subs.update(id, payload);
    if (!updated)
      return res
        .status(404)
        .json({ status: false, message: "Subsidiary not found" });

    res.json({
      status: true,
      message: "Subsidiary updated successfully",
      subsidiary: updated,
    });
  } catch (err) {
    console.error("Error updating subsidiary:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// ❌ Delete subsidiary
const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await Subs.remove(id);
    if (!deleted)
      return res
        .status(404)
        .json({ status: false, message: "Subsidiary not found" });

    res.json({ status: true, message: "Subsidiary deleted successfully" });
  } catch (err) {
    console.error("Error deleting subsidiary:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

const getAllWithBankDetails = async (req, res) => {
  try {
    const limit = Math.min(1000, parseInt(req.query.limit) || 100);
    const offset = parseInt(req.query.offset) || 0;

    const rows = await Subs.getAllWithBankDetails({ limit, offset });

    res.status(200).json({
      status: true,
      count: rows.length,
      subsidiaries: rows,
    });
  } catch (err) {
    console.error("Error fetching subsidiaries with bank details:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getAllWithBankDetails,
};
