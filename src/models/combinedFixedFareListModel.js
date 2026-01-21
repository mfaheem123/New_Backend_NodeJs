const axios = require("axios");

const BASE_URL = "http://192.168.110.5:5000/api";

module.exports = {
  async fetchVehicleTypes() {
    const response = await axios.get(`${BASE_URL}/vehicle-type/get`);
    return response.data?.vehicle_types || [];
  },

  async fetchLocationTypes() {
    const response = await axios.get(`${BASE_URL}/location-types`);
    return response.data?.location_types || [];
  },
};
