const axios = require("axios");

const BASE_URL = "http://192.168.100.93:5000/api";

module.exports = {
  async fetchVehicleTypes() {
    const response = await axios.get(`${BASE_URL}/vehicle-type/get`);
    return response.data?.vehicle_types || [];
  },

  async fetchZones() {
    const response = await axios.get(`${BASE_URL}/zones/get`);
    return response.data?.zones || [];
  },
};
