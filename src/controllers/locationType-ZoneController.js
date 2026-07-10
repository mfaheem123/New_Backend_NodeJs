const axios = require("axios");

const BASE_URL = "http://192.168.110.5:5000/api";

exports.getCombinedData = async (req, res) => {
  try {
    const { company_id } = req.query;
    console.log("Query: ", req.query);
    // Parallel requests for better performance 🚀
    const [locationTypesRes, zonesRes] = await Promise.all([
      axios.get(`${BASE_URL}/location-types`),
      axios.get(`${BASE_URL}/zones/get?company_id=${company_id}`),
    ]);

    const locationTypes = locationTypesRes.data.location_types || [];
    const zones = zonesRes.data.zones || [];

    // Combine both results in one JSON
    const combined = {
      status: true,
      message: "Get Location-Type Zone successfully",
      location_types_count: locationTypes.length,
      zones_count: zones.length,
      location_types: locationTypes,
      zones: zones,
    };

    res.status(200).json(combined);
  } catch (error) {
    console.error("Error fetching combined data:", error.message);
    res.status(500).json({
      status: false,
      message: "Error fetching combined data",
      error: error.message,
    });
  }
};

