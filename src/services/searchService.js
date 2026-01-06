const axios = require("axios");
const { getLocationTypes } = require("../utils/locationTypeCache");

const BASE_URL = "http://192.168.110.4:5000/api";
const LOCATIONS_URL = `${BASE_URL}/locations/get`;
const ADDRESS_SEARCH_URL = `${BASE_URL}/addresses/search?search=`;

/**
 * Search by:
 * 1. locationType.shortcut (e.g., "a" → airport)
 * 2. location.shortcut (e.g., "A H" → Heathrow)
 * 3. fallback: address search API
 */

const searchAddressOrShortcut = async (query) => {
  const locationTypes = getLocationTypes();
  const searchTerm = query.trim().toLowerCase();

  // Step 1️⃣ — Check in location types
  const matchedType = locationTypes.find(
    (t) => t.shortcut && t.shortcut.toLowerCase() === searchTerm
  );

  // Fetch all locations once
  const locRes = await axios.get(LOCATIONS_URL);
  const allLocations = locRes.data.locations || [];

  // ✅ Step 1️⃣ If location type shortcut found
  if (matchedType) {
    const filtered = allLocations
      .filter((loc) => loc.location_type_id === matchedType.id)
      .map((loc) => ({
        name: loc.name,
        postcode: loc.postcode,
        lat: loc.latitude,
        lon: loc.longitude,
      }));

    if (filtered.length > 0) {
      return {
        status: true,
        source: "locations",
        count: filtered.length,
        result: filtered,
      };
    }
  }

  // ✅ Step 2️⃣ If not found, check in locations.shortcut
  const shortcutMatches = allLocations
    .filter(
      (loc) => loc.shortcut && loc.shortcut.toLowerCase().trim() === searchTerm
    )
    .map((loc) => ({
      name: loc.name,
      postcode: loc.postcode,
      lat: loc.latitude,
      lon: loc.longitude,
    }));

  if (shortcutMatches.length > 0) {
    return {
      status: true,
      source: "locations",
      count: shortcutMatches.length,
      result: shortcutMatches,
    };
  }

  // ✅ Step 3️⃣ Fallback: address search
  const addrRes = await axios.get(
    `${ADDRESS_SEARCH_URL}${encodeURIComponent(query)}`
  );
  const addresses = (addrRes.data || []).map((item) => ({
    name: item.name,
    postcode: item.postcode,
    lat: item.lat,
    lon: item.lon,
  }));

  return {
    status: true,
    source: "addresses",
    count: addresses.length,
    result: addresses,
  };
};

module.exports = { searchAddressOrShortcut };
