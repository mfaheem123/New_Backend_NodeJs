const Escort = require("../models/escortModel");
const Account = require("../models/accountModel");
const BASE_URL = process.env.BASE_URL || "http://192.168.110.5:5000/uploads/";

// ---------------------------------------------------------
// CREATE ESCORT WITH DOCUMENTS CONTROLLER
// ---------------------------------------------------------
const create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD ESCORT BODY:",
      JSON.stringify(req.body, null, 2),
    );
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
      JSON.stringify(req.body, null, 2),
    );
    const escort = await Escort.create(req.body);
    res.status(200).json({ status: true, escort });
  } catch (err) {
    console.error("Error creating escort:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

// ---------------------------------------------------------
// GET ALL ESCORTS CONTROLLER
// ---------------------------------------------------------
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
      company_id,
    } = req.query;

    const { escorts, total } = await Escort.findAll({
      page: Number(page),
      limit: Number(limit),
      name,
      safeguarding_expiry,
      pat_expiry,
      firstaid_expiry,
      dbs_expiry,
      company_id,
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

// ---------------------------------------------------------
// GET ESCORT BY ID CONTROLLER
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// UPDATE ESCORT CONTROLLER
// ---------------------------------------------------------
const update = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING UPDATE ESCORT BODY:",
      JSON.stringify(req.body, null, 2),
    );
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
      JSON.stringify(req.body, null, 2),
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

// ---------------------------------------------------------
// DELETE ESCORT CONTROLLER
// ---------------------------------------------------------
const remove = async (req, res) => {
  try {
    const result = await Escort.remove(req.params.id);

    // agar koi row delete hi nahi hui
    if (!result || result.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Escort not found",
      });
    }

    res.json({
      status: true,
      message: "Escort deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting escort:", err);
    res.status(500).json({
      status: false,
      message: "Server Error",
    });
  }
};

// ---------------------------------------------------------
// GET ALL ESCORTS BY CHECKING ACCOUNT HAS ESCORT TRUE
// ---------------------------------------------------------
const getAllByAccountHasEscort = async (req, res) => {
  try {
    const { account_id, company_id } = req.query;

    if (!account_id || !company_id) {
      return res.status(400).json({
        status: false,
        message: "account_id and company_id are required",
      });
    }

    const account = await Account.getAccountById(account_id);
    if (!account) {
      return res.status(404).json({
        status: false,
        message: "Account not found",
      });
    }

    if (account.has_escort !== true) {
      return res.status(200).json({
        status: true,
        escorts: [], // Fixed: Key name consistent (escorts)
      });
    }

    // FIX: Pass as an object { company_id } instead of raw parameter
    const { escorts } = await Escort.findAllByCompany(company_id);

    return res.status(200).json({
      status: true,
      escorts,
    });
  } catch (err) {
    console.error("Error fetching escorts by account:", err);
    res.status(500).json({ status: false, message: "Server Error" });
  }
};

module.exports = {
  create,
  getAll,
  getById,
  update,
  remove,
  getAllByAccountHasEscort,
};
