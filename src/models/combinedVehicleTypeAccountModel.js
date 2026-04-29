// models/combinedModel.js
const axios = require("axios");

const BASE_URL = "http://192.168.110.6:5000/api";

module.exports = {
  async fetchVehicleTypes(company_id) {
    const response = await axios.get(
      `${BASE_URL}/vehicle-type/get?company_id=${company_id}`,
    );
    return response.data?.vehicle_types || [];
  },

  async fetchAccounts(company_id) {
    const response = await axios.get(
      `${BASE_URL}/accounts/get?company_id=${company_id}`,
    );
    return response.data?.accounts || [];
  },
};
