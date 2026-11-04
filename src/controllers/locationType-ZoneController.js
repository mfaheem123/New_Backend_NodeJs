const axios = require("axios");
const LocationType = require("../models/locationTypeModel");
const Zone = require("../models/zoneModel");

exports.getCombinedData = async (req, res) => {
  try {
    const { company_id } = req.query;

    // Parallel DB Queries
    const [locationTypes, zoneResult] = await Promise.all([
      LocationType.getAll(),
      Zone.getAll({
        page: 1,
        limit: 1000000, // ya Number.MAX_SAFE_INTEGER
        company_id,
      }),
    ]);

    const combined = {
      status: true,
      message: "Get Location-Type Zone successfully",
      location_types_count: locationTypes.length,
      zones_count: zoneResult.zones.length,
      location_types: locationTypes,
      zones: zoneResult.zones,
    };

    return res.status(200).json(combined);
  } catch (error) {
    console.error("Error fetching combined data:", error);

    return res.status(500).json({
      status: false,
      message: "Error fetching combined data",
      error: error.message,
    });
  }
};
