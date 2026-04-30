const fareByVehicleModel = require("../models/fareByVehicleModel");

// GET ALL
exports.getAll = async (req, res) => {
  try {
    const {company_id} = req.query;
    const fareByVehicles = await fareByVehicleModel.getAll(company_id);
    const count = await fareByVehicleModel.getCount(company_id);

    res.json({
      status: true,
      count,
      fare_by_vehicles: fareByVehicles,
    });
  } catch (error) {
    console.error("Error fetching fares:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// GET BY ID
exports.getById = async (req, res) => {
  try {
    const fare = await fareByVehicleModel.getById(req.params.id);
    if (!fare)
      return res.status(404).json({ status: false, message: "Not found" });
    res.json({ status: true, fare_by_vehicle: fare });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// CREATE
exports.create = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING UPDATE FARE BY VEHICLE BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const newFare = await fareByVehicleModel.create(req.body);
    res.status(200).json({
      status: true,
      fare_by_vehicle: newFare,
    });
  } catch (error) {
    console.error("Error creating fare:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// UPDATE
exports.update = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING UPDATE FARE BY VEHICLE BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const updatedFare = await fareByVehicleModel.update(
      req.params.id,
      req.body,
    );
    if (!updatedFare)
      return res.status(404).json({ status: false, message: "Not found" });

    res.json({ status: true, fare_by_vehicle: updatedFare });
  } catch (error) {
    console.error("Error updating fare:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// DELETE
exports.remove = async (req, res) => {
  try {
    const deleted = await fareByVehicleModel.remove(req.params.id);
    if (!deleted)
      return res
        .status(404)
        .json({ status: false, message: "Fare By Vehicle Not found" });

    res.status(200).json({
      status: true,
      message: "Fare By Vehicle Deleted Successfully",
    });
  } catch (error) {
    console.error("Error deleting fare:", error);
    res.status(500).json({ status: false, message: "Server error" });
  }
};
