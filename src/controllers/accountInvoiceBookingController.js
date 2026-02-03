const Model = require("../models/accountInvoiceBookingModel");

exports.getBookingsForInvoice = async (req, res) => {
  try {
    const {
      subsidiary_id,
      account_id,
      from_date,
      to_date,
      department,
      order_number
    } = req.query;

    if (!subsidiary_id || !account_id || !from_date || !to_date) {
      return res.status(400).json({
        status: false,
        message: "subsidiary_id, account_id, from_date, to_date are required"
      });
    }

    const bookings = await Model.getForAccountInvoice({
      subsidiary_id,
      account_id,
      from_date,
      to_date,
      department,
      order_number
    });

    res.json({
      status: true,
      count: bookings.length,
      bookings
    });

  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    });
  }
};
