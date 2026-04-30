const CombinedModel = require("../models/combinedPlotFareListModel");

exports.getVehicleTypeAndZones = async (req, res) => {
  try {
    const { company_id } = req.query;
    // Parallel API calls for better performance 🚀
    const [vehicleTypes, zones] = await Promise.all([
      CombinedModel.fetchVehicleTypes(company_id),
      CombinedModel.fetchZones(company_id),
    ]);

    // Filtered fields (you can adjust as needed)
    const filteredVehicleTypes = vehicleTypes.map((v) => ({
      id: v.id,
      name: v.name,
    }));

    const filteredzones = zones.map((z) => ({
      id: z.id,
      name: z.name,
      secondary_name: z.secondary_name,
    }));

    // Combined response
    const response = {
      status: true,
      message: "Fetched Vehicle Types and Zones successfully",
      vehicle_types_count: filteredVehicleTypes.length,
      zones_count: filteredzones.length,
      vehicle_types: filteredVehicleTypes,
      zones: filteredzones,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error fetching combined data:", error.message);
    res.status(500).json({
      status: false,
      message: "Error fetching combined data",
      error: error.message,
    });
  }
};
