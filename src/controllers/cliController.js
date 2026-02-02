const cliService = require("../services/cliService");

exports.findCustomer = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        success: false,
        message: "Phone number is required",
      });
    }

    const result = await cliService.findCustomerByPhone(phone);

    return res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("CLI findCustomer error:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
