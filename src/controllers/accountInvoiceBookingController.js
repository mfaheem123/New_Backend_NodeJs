const Model = require("../models/accountInvoiceBookingModel");

// ---------------------------------------------------------
// GET BOOKING FOR ACCOUNT INVOICE
// ---------------------------------------------------------
exports.getBookingsForInvoice = async (req, res) => {
  try {
    const {
      subsidiary_id,
      account_id,
      from_date,
      to_date,
      department,
      order_number,
    } = req.query;

    if (!subsidiary_id || !account_id || !from_date || !to_date) {
      return res.status(400).json({
        status: false,
        message: "subsidiary_id, account_id, from_date, to_date are required",
      });
    }

    // 📦 Get bookings from model
    const bookings = await Model.getForAccountInvoice({
      subsidiary_id,
      account_id,
      from_date,
      to_date,
      department,
      order_number,
    });

    // 🔢 totals calculate
    const totals = bookings.reduce(
      (acc, b) => {
        const fare = Number(b.fares || 0);
        const parking = Number(b.parking_charges || 0);
        const waiting = Number(b.waiting_charges || 0);
        const extraDrop = Number(b.extra_drop_charges || 0);
        const meet = Number(b.meet_and_greet || 0);
        const congestion = Number(b.congestion_charges || 0);

        acc.fare_total += fare;
        acc.parking_charges_total += parking;
        acc.waiting_charges_total += waiting;
        acc.extra_drop_charges_total += extraDrop;
        acc.meet_and_greet_total += meet;
        acc.congestion_charges_total += congestion;

        acc.total += fare + parking + waiting + extraDrop + meet + congestion;

        return acc;
      },
      {
        fare_total: 0,
        parking_charges_total: 0,
        waiting_charges_total: 0,
        extra_drop_charges_total: 0,
        meet_and_greet_total: 0,
        congestion_charges_total: 0,
        total: 0,
      },
    );

    // Final response
    res.status(200).json({
      status: true,
      count: bookings.length,
      bookings,
      total: [
        {
          fare_total: totals.fare_total.toFixed(2),
          parking_charges_total: totals.parking_charges_total.toFixed(2),
          waiting_charges_total: totals.waiting_charges_total.toFixed(2),
          extra_drop_charges_total: totals.extra_drop_charges_total.toFixed(2),
          meet_and_greet_total: totals.meet_and_greet_total.toFixed(2),
          congestion_charges_total: totals.congestion_charges_total.toFixed(2),
          total: totals.total.toFixed(2),
          grand_total: totals.total.toFixed(2),
        },
      ],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};
