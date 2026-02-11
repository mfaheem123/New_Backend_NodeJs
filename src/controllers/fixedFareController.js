const FixedFare = require("../models/fixedFareModel");

exports.createFixedFares = async (req, res) => {
  try {
    let fixedFares = req.body;

    // If form-data used with "data" key (stringified array)
    if (typeof fixedFares.data === "string") {
      fixedFares = JSON.parse(fixedFares.data);
    }

    // If single object was sent
    if (!Array.isArray(fixedFares)) {
      fixedFares = [fixedFares];
    }

    if (fixedFares.length === 0) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid payload" });
    }

    const newFares = await FixedFare.create(fixedFares);
    res.json({ status: true, fixed_fare: newFares });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.getAllFixedFares = async (req, res) => {
  try {
    const { offset = 0, limit = 100 } = req.query;
    const fares = await FixedFare.getAll(offset, limit);
    res.json({ status: true, count: fares.length, fixed_fares: fares });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
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
    const { id } = req.params;
    const updated = await FixedFare.update(id, req.body);
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
      return res.status(404).json({ status: false, message: "Fixed Fare Not Found" });
    }

    res.json({ status: true, message: "Fixed Fare Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
};

