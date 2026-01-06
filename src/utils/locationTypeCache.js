const axios = require("axios");

const LOCATION_TYPES_URL = "http://192.168.110.4:5000/api/location-types";

let locationTypes = [];

const loadLocationTypes = async () => {
  try {
    const res = await axios.get(LOCATION_TYPES_URL);
    if (res.data?.status) {
      locationTypes = res.data.location_types;
      console.log(`✅ Loaded ${locationTypes.length} location types`);
    }
  } catch (err) {
    console.error("❌ Failed to load location types:", err.message);
  }
};

// Start loading
loadLocationTypes();

// Auto refresh every hour
setInterval(loadLocationTypes, 60 * 60 * 1000);

const getLocationTypes = () => locationTypes;

module.exports = { loadLocationTypes, getLocationTypes };
