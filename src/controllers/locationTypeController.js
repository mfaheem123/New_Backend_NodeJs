const LocationType = require("../models/locationTypeModel");

exports.create = async (req, res) => {
  try {
    const result = await LocationType.create(req.body);
    res.status(200).json({
      message: "Add Location Type Successfully",
      result: result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const addresses = await LocationType.getAll();
    res.status(200).json({
      message: "Get All Location Type Successfully",
      status: true,
      count: addresses.length,
      location_types: addresses,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message,
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const result = await LocationType.getById(req.params.id);
    if (!result) return res.status(404).json({ message: "Not found" });
    res.status(200).json({
      message: "Get Location Type by ID Successfully",
      status: true,
      count: result.length,
      location_types: result,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      error: err.message,
    });
  }
};

exports.update = async (req, res) => {
  try {
    const result = await LocationType.update(req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const result = await LocationType.delete(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
