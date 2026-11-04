const EnumerationsModel = require("../models/enumerationsModel");

// Get All Enumerations
exports.getAllEnumerations = async (req, res) => {
  try {
    const { company_id } = req.query;
    const data = await EnumerationsModel.getAll(company_id);

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

exports.updatePaymentType = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING UPDATE PAYMENT TYPES BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const id = parseInt(req.params.id);

    if (!id) {
      return res.status(400).json({
        status: false,
        message: "Invalid payment type id",
      });
    }

    const data = await EnumerationsModel.updatePaymentType(id, req.body);

    return res.json({
      status: true,
      payment_type: data,
    });
  } catch (error) {
    console.log("Error Updating Payment Type:", error);

    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.getBookingCountEnumerations = async (req, res) => {
  try {
    const { company_id } = req.query;
    const data = await EnumerationsModel.getBookingCount(company_id);

    return res.json({
      status: true,
      ...data,
    });
  } catch (error) {
    console.log("Error Getting Booking Count:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};
