const axios = require("axios");

const BASE_URL = "http://192.168.110.5:5000/api";

module.exports = {
  async fetchVehicleTypes(company_id) {
    const response = await axios.get(`${BASE_URL}/vehicle-type/get?company_id=${company_id}`);
    return response.data?.vehicle_types || [];
  },

  async fetchZones(company_id) {
    const response = await axios.get(`${BASE_URL}/zones/get?company_id=${company_id}`);
    return response.data?.zones || [];
  },
};
