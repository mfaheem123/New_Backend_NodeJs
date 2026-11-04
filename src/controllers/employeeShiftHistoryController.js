const employeeShiftHistoryModel = require("../models/employeeShiftHistoryModel");

exports.getEmployeeShiftHistory = async (req, res) => {
  try {
    const {
      employee_id,
      from_date,
      to_date,
      from_time,
      to_time,
      // Column Search Params
      search_login,
      search_logout,
      search_bookings_created,
      search_bookings_dispatched,
      search_bookings_cancelled,
      search_calls_answered,
      // Pagination Params
      page = 1,
      limit = 20,
    } = req.query;

    if (!employee_id) {
      return res.status(400).json({
        status: false,
        message: "employee_id is required",
      });
    }

    const result = await employeeShiftHistoryModel.getEmployeeShiftHistory({
      employee_id,
      from_date,
      to_date,
      from_time,
      to_time,
      search_login,
      search_logout,
      search_bookings_created,
      search_bookings_dispatched,
      search_bookings_cancelled,
      search_calls_answered,
      page,
      limit,
    });

    return res.status(200).json({
      status: true,
      page: result.page,
      limit: result.limit,
      total: result.total,
      total_pages: result.total_pages,
      count: result.count,
      employee_shift_history: result.data,
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
