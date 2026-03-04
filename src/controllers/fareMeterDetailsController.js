const FareConfiguration = require("../models/fareConfigurationModel");
const FareMeter = require("../models/fareMeterModel");
const VehicleType = require("../models/vehicleTypeModel");

exports.getByVehicleType = async (req, res) => {
  try {
    const { vehicle_type_id } = req.query;

    // 🔴 1. Check if query param provided
    if (!vehicle_type_id) {
      return res.status(400).json({
        success: false,
        message: "vehicle_type_id is required in query",
      });
    }

    // 🔴 2. Check if vehicle_type exists
    const vehicleExists = await VehicleType.exists(vehicle_type_id);

    if (!vehicleExists) {
      return res.status(404).json({
        success: false,
        message: "Vehicle type not found",
      });
    }

    // 🔹 3. Get Fare Configurations
    const configurations =
      await FareConfiguration.getByVehicleTypeId(vehicle_type_id);

    // 🔹 4. Get Fare Meters
    const meterResult =
      await FareMeter.getByVehicleTypeId(vehicle_type_id);

    return res.status(200).json({
      success: true,
      vehicle_type_id,
      data: {
        fare_configurations: configurations,
        fare_meter: meterResult.rows,
      },
    });

  } catch (error) {
    console.error("ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};