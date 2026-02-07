const FareIncrement = require("../models/fareIncrementModel");

// GET ALL
exports.getAll = async (req, res) => {
  try {
    const data = await FareIncrement.getAll();
    res.json({ status: true, count: data.length, fareIncrement: data });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// ADD
exports.add = async (req, res) => {
  try {
    const data = await FareIncrement.create(req.body);

    res.json({
      status: true,
      fareIncrement: data,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    const id = req.params.id;
    console.log(
      "🚀 INCOMING FARE INCREMENT BODY BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const updated = await FareIncrement.update(id, req.body);

    res.json({
      status: true,
      fareIncrement: updated,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

// DELETE
exports.delete = async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    await FareIncrement.delete(id);

    res.json({
      status: true,
      message: "Fare increment deleted successfully",
    });
  } catch (err) {
    res.status(404).json({
      status: false,
      message: err.message,
    });
  }
};
