const model = require("../models/driverShiftHistoryModel");


// CREATE
exports.createHistory = async (req, res) => {
  try {

    const data = await model.createHistory(req.body);

    return res.status(201).json({
      status: true,
      message: "History created successfully",
      data,
    });

  } catch (error) {

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};



// GET ALL
exports.getHistories = async (req, res) => {
  try {

    const histories = await model.getHistories(req.query);

    return res.json({
      status: true,
      driver_shift_histories: histories,
    });

  } catch (error) {

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};



// GET SINGLE
exports.getHistoryById = async (req, res) => {
  try {

    const history = await model.getHistoryById(req.params.id);

    if (!history) {
      return res.status(404).json({
        status: false,
        message: "Record not found",
      });
    }

    return res.json({
      status: true,
      data: history,
    });

  } catch (error) {

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};



// UPDATE
exports.updateHistory = async (req, res) => {
  try {

    const history = await model.updateHistory(
      req.params.id,
      req.body
    );

    if (!history) {
      return res.status(404).json({
        status: false,
        message: "Record not found",
      });
    }

    return res.json({
      status: true,
      message: "Updated successfully",
      data: history,
    });

  } catch (error) {

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};



// DELETE
exports.deleteHistory = async (req, res) => {
  try {

    const history = await model.deleteHistory(req.params.id);

    if (!history) {
      return res.status(404).json({
        status: false,
        message: "Record not found",
      });
    }

    return res.json({
      status: true,
      message: "Deleted successfully",
    });

  } catch (error) {

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};