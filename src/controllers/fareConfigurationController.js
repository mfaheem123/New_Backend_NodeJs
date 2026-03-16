const FareConfiguration = require("../models/fareConfigurationModel");

exports.createFareConfiguration = async (req, res) => {
  try {
    console.log("🟢 Received body in /add =>", req.body);

    // Step 1️⃣: Create record
    const data = await FareConfiguration.create(req.body);

    // Step 2️⃣: Fetch complete nested record (joins with vehicle_types + accounts)
    const fullData = await FareConfiguration.getById(data.id);

    res.json({
      status: true,
      fare_configuration: fullData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.getAllFareConfigurations = async (req, res) => {
  try {
    const { title } = req.query;
    const data = await FareConfiguration.getAll(title);
    res.json({
      status: true,
      count: data.length,
      fare_configurations: data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.getFareConfigurationById = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await FareConfiguration.getById(id);

    if (!data) {
      return res
        .status(404)
        .json({ status: false, message: "Fare configuration not found" });
    }

    res.json({
      status: true,
      fare_configuration: data,
    });
  } catch (err) {
    console.error("❌ Error in getFareConfigurationById:", err);
    res.status(500).json({ status: false, error: err.message });
  }
};

exports.updateFareConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await FareConfiguration.update(id, req.body);

    res.json({
      status: true,
      fare_configuration: data,
    });
  } catch (err) {
    console.error(err);

    if (err.message === "Fare configuration not found") {
      return res.status(404).json({
        status: false,
        error: err.message,
      });
    }

    res.status(500).json({
      status: false,
      error: err.message,
    });
  }
};

exports.deleteFareConfiguration = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await FareConfiguration.delete(id);
    if (!deleted) {
      return res.status(404).json({
        status: false,
        message: "Fare Configuration Setting Not found",
      });
    }

    res.json({ status: deleted, message: "Deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: false, error: err.message });
  }
};
