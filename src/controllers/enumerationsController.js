const EnumerationsModel = require("../models/enumerationsModel");

// Get All Enumerations
exports.getAllEnumerations = async (req, res) => {
  try {
    const data = await EnumerationsModel.getAll();

    return res.json({
      status: true,
      ...data,
    });
  } catch (error) {
    console.log("Error Getting Enumerations:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.getAllPaymentTypes = async (req, res) => {
  try {
    const data = await EnumerationsModel.getPaymentTypes();

    return res.json({
      status: true,
      ...data,
    });
  } catch (error) {
    console.log("Error Getting Payment Types:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
