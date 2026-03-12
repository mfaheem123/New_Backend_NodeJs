// models/combinedModel.js
const axios = require("axios");

const BASE_URL = "http://192.168.100.93:5000/api";

module.exports = {
  async fetchVehicleTypes() {
    const response = await axios.get(`${BASE_URL}/vehicle-type/get`);
    return response.data?.vehicle_types || [];
  },

  async fetchAccounts() {
    const response = await axios.get(`${BASE_URL}/accounts/get`);
    return response.data?.accounts || [];
  },
};
