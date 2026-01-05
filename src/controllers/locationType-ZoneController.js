const axios = require("axios");

const BASE_URL = "http://192.168.110.3:5000/api";

exports.getCombinedData = async (req, res) => {
  try {
    // Parallel requests for better performance 🚀
    const [locationTypesRes, zonesRes] = await Promise.all([
      axios.get(`${BASE_URL}/location-types`),
      axios.get(`${BASE_URL}/zones/get`),
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

// REDIS CODE CHECK IN DOCKER

// const axios = require("axios");
// const redis = require("../config/redis"); // <-- your redis.js file
// const BASE_URL = "http://192.168.110.3:5000/api";

// exports.getCombinedData = async (req, res) => {
//   try {
//     const cacheKey = "combinedData";

//     // 1️⃣ Check Redis cache first
//     const cached = await redis.get(cacheKey);
//     if (cached) {
//       console.log("📦 Returning data from Redis cache");
//       return res.status(200).json(JSON.parse(cached));
//     }

//     // 2️⃣ Fetch fresh data from both APIs
//     const [locationTypesRes, zonesRes] = await Promise.all([
//       axios.get(`${BASE_URL}/location-types`),
//       axios.get(`${BASE_URL}/zones`)
//     ]);

//     const locationTypes = locationTypesRes.data.location_types || [];
//     const zones = zonesRes.data.zones || [];

//     const combined = {
//       status: true,
//       message: "Combined data fetched successfully",
//       location_types_count: locationTypes.length,
//       zones_count: zones.length,
//       location_types: locationTypes,
//       zones: zones
//     };

//     // 3️⃣ Store in Redis for 5 minutes (300 seconds)
//     await redis.set(cacheKey, JSON.stringify(combined), "EX", 300);
//     console.log("💾 Cached data stored in Redis for 5 minutes");

//     res.status(200).json(combined);
//   } catch (error) {
//     console.error("❌ Error fetching combined data:", error.message);
//     res.status(500).json({
//       status: false,
//       message: "Error fetching combined data",
//       error: error.message
//     });
//   }
// };
