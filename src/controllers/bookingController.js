const bookingService = require("../services/bookingService");
const {
  getTodayBookings,
  // getAllBookings,
  getRecentBookings,
  getCompletedBookings,
  getWebBookings,
  getQuotedBookings,
  getIvrBookings,
  getAppBookings,
  getPreBookings,
  getBookingsByTab,
} = require("../models/bookingModel");

function parseJSONFields(row) {
  if (!row) return row;

  const jsonFields = [
    "viapoints",
    "restricted_drivers",
    "notes",
    "child_seat",
    "skipped_bookings",
  ];

  const parsed = { ...row };

  jsonFields.forEach((field) => {
    if (parsed[field] && typeof parsed[field] === "string") {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch (e) {
        console.log(`JSON parse failed for field: ${field}`);
      }
    }
  });

  return parsed;
}

exports.createBooking = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD BOOKING BODY:",
      JSON.stringify(req.body, null, 2)
    );

    const payload = req.body;
    const result = await bookingService.create(payload);

    // Parse JSON fields inside results before sending
    if (result.bookings) {
      result.bookings = result.bookings.map(parseJSONFields);
    }
    if (result.return_booking) {
      result.return_booking = result.return_booking.map(parseJSONFields);
    }

    return res.status(200).json({ status: true, ...result });
  } catch (err) {
    console.error("createBooking error", err);
    res
      .status(500)
      .json({ status: false, error: err.message || "Internal error" });
  }
};

exports.getBookingSections = async (req, res) => {
  try {
    const tabId = parseInt(req.params.id);

    let bookings = [];
    let tabName = "";

    switch (tabId) {
      case 1:
        tabName = "TODAY BOOKINGS";
        bookings = (await getTodayBookings()).map(parseJSONFields);
        break;

      case 2:
        tabName = "PRE BOOKINGS";
        bookings = (await getPreBookings()).map(parseJSONFields);
        break;

      case 3:
        tabName = "RECENT BOOKINGS";
        bookings = (await getRecentBookings()).map(parseJSONFields);
        break;

      case 4:
        tabName = "COMPLETED BOOKINGS";
        bookings = (await getCompletedBookings()).map(parseJSONFields);
        break;

      case 5:
        tabName = "QUOTED BOOKINGS";
        bookings = (await getQuotedBookings()).map(parseJSONFields);
        break;

      case 6:
        tabName = "IVR BOOKINGS";
        bookings = (await getIvrBookings()).map(parseJSONFields);
        break;

      case 7:
        tabName = "WEB BOOKINGS";
        bookings = (await getWebBookings()).map(parseJSONFields);
        break;

      case 8:
        tabName = "APP BOOKINGS";
        bookings = (await getAppBookings()).map(parseJSONFields);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Invalid booking tab id",
        });
    }

    return res.status(200).json({
      success: true,
      tab_id: tabId,
      tab_name: tabName,
      booking_count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Error loading Booking Section:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// GET BOOKINGS BY TABS (PAGINATION + SEARCHING)
// ---------------------------------------------------------
exports.getBookingByTabs = async (req, res) => {
  try {
    const tabId = parseInt(req.params.id);

    let {
      page = 1,
      limit = 20,
      reference_number,
      pickup_date,
      pickup_time,
      name,
      pickup,
      dropoff,
      account_name,
      driver_name,
      vehicle_type_name,
      notes,
      fares,
      booking_status,
      journey_type,
      payment_type,
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let tabWhere = "";
    let tabName = "";

    switch (tabId) {
      case 1:
        tabName = "TODAY BOOKINGS";
        tabWhere = `DATE(b.pickup_date) = CURRENT_DATE AND b.booking_status_id = 1`;
        break;

      case 2:
        tabName = "PRE BOOKINGS";
        tabWhere = `DATE(b.pickup_date) > CURRENT_DATE`;
        break;

      case 3:
        tabName = "RECENT BOOKINGS";
        tabWhere = `b.booking_status_id NOT IN (1, 11)`;
        break;

      case 4:
        tabName = "COMPLETED BOOKINGS";
        tabWhere = `b.booking_status_id = 11`;
        break;

      case 5:
        tabName = "QUOTED BOOKINGS";
        tabWhere = `b.quoted = true`;
        break;

      case 6:
        tabName = "IVR BOOKINGS";
        tabWhere = `b.booking_source = 'ivr'`;
        break;

      case 7:
        tabName = "WEB BOOKINGS";
        tabWhere = `b.booking_source = 'web'`;
        break;

      case 8:
        tabName = "APP BOOKINGS";
        tabWhere = `b.booking_source = 'app'`;
        break;

      default:
        return res.status(400).json({ success: false, message: "Invalid tab" });
    }

    const { rows, total } = await getBookingsByTab({
      tabWhere,
      offset,
      limit,
      filters: {
        reference_number,
        pickup_date,
        pickup_time,
        name,
        pickup,
        dropoff,
        account_name,
        driver_name,
        vehicle_type_name,
        notes,
        fares,
        booking_status,
        journey_type,
        payment_type,
      },
    });

    const data = rows.map(parseJSONFields);

    res.json({
      success: true,
      tab_id: tabId,
      tab_name: tabName,
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
      count: data.length,
      data,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
