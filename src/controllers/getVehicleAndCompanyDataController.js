// const axios = require("axios");

// const BASE_URL = "http://192.168.110.5:5000/api";

// exports.getVehicleCompanyAndSubsidiaryData = async (req, res) => {
//   try {
//     // Run all three API requests in parallel 🚀
//     const [vehicleTypeRes, companyVehiclesRes, subsidiariesRes] = await Promise.all([
//       axios.get(`${BASE_URL}/vehicle-type/get`),
//       axios.get(`${BASE_URL}/company-vehicles/get`),
//       axios.get(`${BASE_URL}/subsidiaries/get`)
//     ]);

//     // Extract data safely
//     const vehicleTypes = vehicleTypeRes.data?.vehicle_types || [];
//     const companyVehicles = companyVehiclesRes.data?.vehicles || [];
//     const subsidiaries = subsidiariesRes.data?.subsidiaries || [];

//     // Combine all three results
//     const combined = {
//       status: true,
//       message: "Fetched Vehicle Types, Company Vehicles, and Subsidiaries successfully",
//       vehicle_types_count: vehicleTypes.length,
//       company_vehicles_count: companyVehicles.length,
//       subsidiaries_count: subsidiaries.length,
//       vehicle_types: vehicleTypes,
//       company_vehicles: companyVehicles,
//       subsidiaries: subsidiaries
//     };

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

const axios = require("axios");

const BASE_URL = "http://192.168.110.5:5000/api";

exports.getVehicleCompanyAndSubsidiaryData = async (req, res) => {
  try {
    // Run all three API requests in parallel 🚀
    const [vehicleTypeRes, companyVehiclesRes, subsidiariesRes] =
      await Promise.all([
        axios.get(`${BASE_URL}/vehicle-type/get`),
        axios.get(`${BASE_URL}/company-vehicles/get`),
        axios.get(`${BASE_URL}/subsidiaries/get`),
      ]);

    // Extract and filter required fields only
    const vehicleTypes =
      vehicleTypeRes.data?.vehicle_types?.map((v) => ({
        id: v.id,
        name: v.name,
      })) || [];

    const companyVehicles =
      companyVehiclesRes.data?.vehicles?.map((v) => ({
        id: v.id,
        vehicle_type_name: v.vehicle_type_name,
      })) || [];

    const subsidiaries =
      subsidiariesRes.data?.subsidiaries?.map((s) => ({
        id: s.id,
        name: s.name,
      })) || [];

    // Combined compact response
    const combined = {
      status: true,
      message:
        "Fetched Vehicle Types, Company Vehicles, and Subsidiaries successfully",
      vehicle_types_count: vehicleTypes.length,
      company_vehicles_count: companyVehicles.length,
      subsidiaries_count: subsidiaries.length,
      vehicle_types: vehicleTypes,
      company_vehicles: companyVehicles,
      subsidiaries: subsidiaries,
    };

    res.status(200).json(combined);
  } catch (error) {
    console.error("❌ Error fetching combined data:", error.message);
    res.status(500).json({
      status: false,
      message: "Error fetching combined data",
      error: error.message,
    });
  }
};
