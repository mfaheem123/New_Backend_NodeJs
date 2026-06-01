const employeeShiftHistoryModel = require("../models/employeeShiftHistoryModel");

exports.getEmployeeShiftHistory = async (req, res) => {
  try {
    const { employee_id, from_date, to_date, from_time, to_time } = req.query;

    if (!employee_id) {
      return res.status(400).json({
        status: false,
        message: "employee_id is required",
      });
    }

    const data = await employeeShiftHistoryModel.getEmployeeShiftHistory({
      employee_id,
      from_date,
      to_date,
      from_time,
      to_time,
    });

    return res.status(200).json({
      status: true,
      employee_shift_history: data,
    });
  } catch (error) {
    console.error("EMPLOYEE SHIFT HISTORY ERROR:", error);

    return res.status(500).json({
      status: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
