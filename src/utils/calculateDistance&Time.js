const axios = require("axios");

async function calculateDistanceAndTimeOSRM(
  pickup_lat,
  pickup_lng,
  drop_lat,
  drop_lng,
) {
  try {
    // OSRM demo server URL (replace with your own if you have one)
    const url = `http://router.project-osrm.org/route/v1/driving/${pickup_lng},${pickup_lat};${drop_lng},${drop_lat}?overview=false`;

    const { data } = await axios.get(url);

    if (!data.routes || !data.routes.length) {
      throw new Error("No route found by OSRM");
    }

    const route = data.routes[0];

    const miles = (route.distance / 1609.34).toFixed(2); // meters → miles
    const durationSec = route.duration; // seconds
    const hours = Math.floor(durationSec / 3600);
    const minutes = Math.round((durationSec % 3600) / 60);
    const eta = hours
      ? `${hours} hour${hours > 1 ? "s" : ""} ${minutes} mins`
      : `${minutes} mins`;

    return {
      miles: Number(miles),
      eta,
    };
  } catch (err) {
    console.error("OSRM distance error:", err.message);
    return {
      miles: 0,
      eta: "Unknown",
    };
  }
}

module.exports = {
  calculateDistanceAndTimeOSRM,
};
