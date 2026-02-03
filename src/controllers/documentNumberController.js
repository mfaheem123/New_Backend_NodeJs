const Model = require("../models/documentNumberModel");

/* CREATE */
exports.create = async (req, res) => {
  try {
    const doc = await Model.create(req.body);
    res.json({ status: true, document_number: doc });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

/* GET ALL */
exports.getAll = async (req, res) => {
  try {
    const offset = Number(req.query.offset || 0);
    const limit = Number(req.query.limit || 10);

    const result = await Model.getAll({ offset, limit });

    res.json({
      status: true,
      count: result.count,
      document_numbers: result.rows
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

/* GET BY ID */
exports.getById = async (req, res) => {
  try {
    const doc = await Model.getById(req.params.id);
    if (!doc) {
      return res.status(404).json({ status: false, message: "Not found" });
    }
    res.json({ status: true, document_number: doc });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

/* UPDATE */
exports.update = async (req, res) => {
  try {
    const doc = await Model.update(req.params.id, req.body);
    res.json({ status: true, document_number: doc });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

/* DELETE */
exports.remove = async (req, res) => {
  try {
    const doc = await Model.remove(req.params.id);
    if (!doc) {
      return res.status(404).json({ status: false, message: "Not found" });
    }
    res.json({ status: true, message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
