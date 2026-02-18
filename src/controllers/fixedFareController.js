const FixedFare = require("../models/fixedFareModel");

exports.createFixedFares = async (req, res) => {
  try {
    let fixedFares = req.body;

    if (typeof fixedFares.data === "string") {
      fixedFares = JSON.parse(fixedFares.data);
    }

    if (!Array.isArray(fixedFares)) {
      fixedFares = [fixedFares];
    }

    if (fixedFares.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Invalid payload",
      });
    }

    const newFares = await FixedFare.create(fixedFares);

    res.json({
      status: true,
      message: "Fixed Fare Created Successfully",
      fixed_fare:
        newFares.length === 1 ? newFares[0] : newFares,
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
