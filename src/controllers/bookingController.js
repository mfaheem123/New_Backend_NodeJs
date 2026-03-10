const bookingService = require("../services/bookingService");
const { sendBookingSMS } = require("../utils/sendBookingSMS");
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
  getBookingByIdEnriched,
  findBookingById,
  trashBooking,
  findExistingBookings,
  trashMultipleBookings,
  updateBookingStatus,
  updateBookingFares,
  getBookingByDriverId,
  updateBookingonRoute,
  getBookingByDriverCommission,
  getBookingStatusById,
  getBookingByDriverIdAndStatus,
  hasActiveBookingToday,
  getDriverCurrentJob,
  updateBookingFareCharges,
  getDriverTotalEarning,
} = require("../models/bookingModel");
const Driver = require("../models/driverModel")

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
      JSON.stringify(req.body, null, 2),
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
    const jobDue =
      Number.isInteger(parseInt(req.query.job_due)) &&
      parseInt(req.query.job_due) > 0
        ? parseInt(req.query.job_due)
        : null;

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

    let orderBy = "b.id ASC";

    switch (tabId) {
      case 1:
        tabName = "TODAY BOOKINGS";
        tabWhere = `
          DATE(b.pickup_date) = CURRENT_DATE
          AND b.booking_status_id = 1 AND b.trash = false
        `;
        orderBy = `
          TRIM(b.pickup_time)::time ASC,
          b.id ASC
        `;
        break;
      case 2:
        tabName = "PRE BOOKINGS";
        tabWhere = `DATE(b.pickup_date) > CURRENT_DATE AND b.trash = false`;
        break;

      case 3:
        tabName = "RECENT BOOKINGS";
        tabWhere = `b.booking_status_id NOT IN (1, 11) AND b.trash = false`;
        break;

      case 4:
        tabName = "COMPLETED BOOKINGS";
        tabWhere = `b.booking_status_id = 11 AND b.trash = false`;
        break;

      case 5:
        tabName = "QUOTED BOOKINGS";
        tabWhere = `b.quoted = true AND b.trash = false`;
        break;

      case 6:
        tabName = "IVR BOOKINGS";
        tabWhere = `b.booking_source = 'ivr' AND b.trash = false`;
        break;

      case 7:
        tabName = "WEB BOOKINGS";
        tabWhere = `b.booking_source = 'web' AND b.trash = false`;
        break;

      case 8:
        tabName = "APP BOOKINGS";
        tabWhere = `b.booking_source = 'app'AND b.trash = false`;
        break;

      case 9:
        tabName = "MULTI BOOKINGS";
        tabWhere = `b.booking_type_id = 2 AND b.trash = false`;
        break;

      case 10:
        tabName = "PENDING BOOKINGS";
        tabWhere = `b.booking_status_id != 11`;
        break;

      case 11:
        tabName = "TRASH BOOKINGS";
        tabWhere = `b.trash = true`;
        break;

      default:
        return res.status(400).json({ success: false, message: "Invalid tab" });
    }

    if (jobDue && tabId === 1) {
      tabName = `DUE IN ${jobDue} MIN`;

      tabWhere += `
    AND (
      b.pickup_date::date + TRIM(b.pickup_time)::time
    ) BETWEEN NOW() AND NOW() + INTERVAL '${jobDue} minutes'
  `;

      orderBy = `
    (b.pickup_date::date + TRIM(b.pickup_time)::time) ASC
  `;
    }

    const { rows, total } = await getBookingsByTab({
      tabWhere,
      offset,
      limit,
      orderBy,
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

// Get Booking By ID
exports.getBookingById = async (req, res) => {
  const booking_id = parseInt(req.params.id);
  console.log(
    "🚀 INCOMING GET BOOKING BODY:",
    JSON.stringify(req.params, null, 2),
  );

  const booking = await getBookingByIdEnriched(booking_id);

  if (!booking) {
    return res.status(404).json({
      success: false,
      message: "Booking not found",
    });
  }

  const data = parseJSONFields(booking);

  res.status(200).json({
    success: true,
    booking: data,
  });
};

// Update Booking
exports.updateBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    console.log(
      "🚀 INCOMING UPDATE BOOKING BODY:",
      JSON.stringify(req.body, null, 2),
    );
    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking id",
      });
    }

    const updated = await bookingService.updateBookingService(
      bookingId,
      req.body,
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({
      success: true,
      booking: updated,
    });
  } catch (err) {
    console.error("updateBooking error:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Internal server error",
    });
  }
};

// Delete Booking To Trash
exports.deleteBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const booking = await findBookingById(bookingId);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    await trashBooking(bookingId);

    return res.status(200).json({
      status: true,
      message: "Booking Deleted Successfully",
    });
  } catch (error) {
    console.error("Delete Booking Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// Bulk Delete
exports.deleteMultipleBookings = async (req, res) => {
  try {
    let { id } = req.body;

    // parse stringified array
    if (typeof id === "string") {
      id = JSON.parse(id);
    }

    // force numbers
    id = id.map(Number);

    if (!Array.isArray(id) || id.length === 0) {
      return res.status(400).json({
        status: false,
        message: "id must be a non-empty array",
      });
    }

    const existing = await findExistingBookings(id);

    // convert DB ids to numbers
    const existingIds = existing.rows.map((row) => Number(row.id));

    const missingIds = id.filter((item) => !existingIds.includes(item));

    await trashMultipleBookings(existingIds);

    if (missingIds.length > 0) {
      return res.status(207).json({
        status: false,
        message: "Some bookings not found",
        deleted_ids: existingIds,
        missing_ids: missingIds,
      });
    }

    return res.status(200).json({
      status: true,
      message: "Bookings Deleted Successfully",
    });
  } catch (error) {
    console.error("Multiple Delete Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// exports.updateBookingStatus = async (req, res) => {
//   try {
//     const bookingId = parseInt(req.params.id);
//     const { booking_status_id } = req.body;

//     if (!booking_status_id) {
//       return res.status(400).json({
//         status: false,
//         message: "booking_status_id is required",
//       });
//     }

//     const booking = await findBookingById(bookingId);

//     if (booking.rowCount === 0) {
//       return res.status(404).json({
//         status: false,
//         message: "Booking not found",
//       });
//     }

//     if (booking_status_id == 3) {
//       await updateBookingonRoute(bookingId, true, false, false);
//     }

//     if (booking_status_id == 11) {
//       await updateBookingonRoute(bookingId, false, true, true);
//       await Driver.updateDriverStatus(booking.driver_id, "Available", "Available")
//     }

//     if (booking_status_id == 6) {
//       await updateBookingonRoute(bookingId, false, false, true);
      
//     }

//     await updateBookingStatus(bookingId, booking_status_id);
//             await Driver.updateDriverStatus(booking.driver_id, "Unavailable", "Unavailable")


//     // 🔹 GET UPDATED BOOKING
//     const updatedBooking = await findBookingById(bookingId);

//     // 🔹 SEND SMS
//     await sendBookingSMS(updatedBooking.rows[0]);

//     return res.status(200).json({
//       status: true,
//       message: "Booking status updated successfully",
//     });
//   } catch (error) {
//     console.error("Update Booking Status Error:", error);

//     return res.status(500).json({
//       status: false,
//       message: "Internal Server Error",
//     });
//   }
// };


exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { booking_status_id } = req.body;

    if (!booking_status_id) {
      return res.status(400).json({
        status: false,
        message: "booking_status_id is required",
      });
    }

    const booking = await findBookingById(bookingId);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    const driverId = booking.rows[0].driver_id;

    // ON ROUTE
    if (booking_status_id == 3) {
      await updateBookingonRoute(bookingId, true, false, false);
    }

    // ARRIVED
    if (booking_status_id == 6) {
      await updateBookingonRoute(bookingId, false, false, true);
    }

    // COMPLETED
    if (booking_status_id == 11) {
      await updateBookingonRoute(bookingId, false, true, true);
      await Driver.updateDriverStatus(driverId, "Available", "Available");
    }

    // UPDATE BOOKING STATUS
    await updateBookingStatus(bookingId, booking_status_id);

    // DRIVER UNAVAILABLE FOR THESE STATUS
    const unavailableStatuses = [15, 10, 9, 6, 3];

    if (unavailableStatuses.includes(booking_status_id)) {
      await Driver.updateDriverStatus(driverId, "Unavailable", "Unavailable");
    }

    const updatedBooking = await findBookingById(bookingId);

    await sendBookingSMS(updatedBooking.rows[0]);

    return res.status(200).json({
      status: true,
      message: "Booking status updated successfully",
    });

  } catch (error) {
    console.error("Update Booking Status Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

exports.updateBookingFares = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const {
      fares,
      parking_charges,
      waiting_charges,
      extra_drop_charges,
      total_charges,
    } = req.body;

    if (!fares) {
      return res.status(400).json({
        status: false,
        message: "fares is required",
      });
    }

    const booking = await findBookingById(bookingId);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    await updateBookingFares(
      bookingId,
      fares,
      parking_charges,
      waiting_charges,
      extra_drop_charges,
      total_charges,
    );

    return res.status(200).json({
      status: true,
      message: "Booking Fares updated successfully",
      fares: fares,
    });
  } catch (error) {
    console.error("Update Booking Fares Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

exports.getBookingByDriverId = async (req, res) => {
  const driver_id = parseInt(req.params.id);
  const lastdays = req.query.lastdays ? parseInt(req.query.lastdays) : null;

  const bookings = await getBookingByDriverId(driver_id, lastdays);

  if (!bookings || bookings.length === 0) {
    return res.status(404).json({
      success: false,
      message: "Booking Not Found",
    });
  }

  const data = bookings.map((b) => parseJSONFields(b));

  res.status(200).json({
    success: true,
    count: bookings.length,
    bookings: data,
  });
};

exports.getBookingByDriverCommission = async (req, res) => {
  const { driver_id, payment_type_id, from_date, to_date } = req.query;

  if (!driver_id || !payment_type_id || !from_date || !to_date) {
    return res.status(400).json({
      success: false,
      message: "driver_id, payment_type_id, from_date and to_date are required",
    });
  }

  let paymentTypeArray;

  try {
    // handle both single and multiple values
    paymentTypeArray = Array.isArray(payment_type_id)
      ? payment_type_id.map(Number)
      : JSON.parse(payment_type_id).map(Number);
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: "payment_type_id must be valid array like [1,3]",
    });
  }

  const bookings = await getBookingByDriverCommission(
    Number(driver_id),
    paymentTypeArray,
    from_date,
    to_date,
  );

  if (!bookings.length) {
    return res.status(404).json({
      success: false,
      message: "No bookings found in given date range",
    });
  }

  const data = bookings.map(parseJSONFields);

  res.status(200).json({
    success: true,
    count: data.length,
    bookings: data,
  });
};

exports.cloneOneWayBooking = async (req, res) => {
  try {
    const { booking_id, vehicle_type_id, pickup_date, pickup_time, driver_id } =
      req.body;
    console.log(
      "🚀 INCOMING ADD CLI BOOKING BODY:",
      JSON.stringify(req.body, null, 2),
    );
    if (!booking_id || !vehicle_type_id || !pickup_date || !pickup_time) {
      return res.status(400).json({
        success: false,
        message:
          "booking_id, vehicle_type_id, pickup_date and pickup_time are required",
      });
    }

    const result = await bookingService.cloneOneWayBookingService({
      booking_id,
      vehicle_type_id,
      pickup_date,
      pickup_time,
      driver_id,
    });

    return res.status(200).json({
      success: true,
      booking: result,
    });
  } catch (err) {
    console.error("cloneOneWayBooking error:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.checkBookingStatus = async (req, res) => {
  try {
    const { booking_id } = req.params;

    if (!booking_id) {
      return res.status(400).json({
        status: false,
        message: "Booking ID is required",
      });
    }

    const booking = await getBookingStatusById(booking_id);

    if (!booking) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    const isTrue =
      booking.booking_status_id === 1 || booking.booking_status_id === "1";

    return res.json({
      status: true,
      booking_id: booking_id,
      booking_status_id: booking.booking_status_id,
      booking_status: isTrue,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

exports.getBookingByDriverIdAndStatus = async (req, res) => {
  const { driver_id, booking_status_id } = req.body;

if(!driver_id){
  return res.status(400).json({
    status:false,
    message: "Driver ID Required"
  });
}

if(!booking_status_id){
  return res.status(400).json({
    status:false,
    message: "Booking Status ID Required"
  });
}
  const bookings = await getBookingByDriverIdAndStatus(
    driver_id,
    booking_status_id,
  );

  if (!bookings || bookings.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No bookings found for this driver",
    });
  }

  const data = bookings.map((b) => parseJSONFields(b));

  res.status(200).json({
    success: true,
    count: bookings.length,
    bookings: data,
  });
};

exports.checkDriverActiveBookingToday = async (req, res) => {
  try {
    const { driver_id } = req.query;

    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "driver_id is required",
      });
    }

    const { has_active, booking_id } = await hasActiveBookingToday(driver_id);

    return res.json({
      status: true,
      driver_id,
      booking_id: booking_id,
      has_active_booking: has_active,
    });
  } catch (error) {
    console.error("Error checking driver booking:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.getCurrentJob = async (req, res) => {
  try {
    const { driver_id } = req.query;

    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "driver_id is required",
      });
    }

    const job = await getDriverCurrentJob(driver_id);

    return res.json({
      status: true,
      has_current_job: !!job,
      booking: job,
    });
  } catch (error) {
    console.error("Error fetching current job:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

exports.updateBookingFareCharges = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const {
      fares,
      parking_charges,
      waiting_charges,
      extra_drop_charges,
      meet_and_greet,
      congestion_charges,
      total_charges,
    } = req.body;
    console.log(
      "🚀 INCOMING UPDATE BOOKING CHARGES BODY:",
      JSON.stringify(req.body, null, 2),
    );
    if (
      !fares ||
      !parking_charges ||
      !waiting_charges ||
      !extra_drop_charges ||
      !congestion_charges ||
      !total_charges
    ) {
      return res.status(400).json({
        status: false,
        message: "All Fares Are Required",
      });
    }

    const booking = await findBookingById(bookingId);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    await updateBookingFareCharges(
      bookingId,
      fares,
      parking_charges,
      waiting_charges,
      extra_drop_charges,
      meet_and_greet,
      congestion_charges,
      total_charges,
    );

    return res.status(200).json({
      status: true,
      message: "Booking Fares updated successfully",
      fares: fares,
    });
  } catch (error) {
    console.error("Update Booking Fares Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

exports.getDriverEarning = async (req, res) => {
  try {
    const driver_id = req.params.id;
    console.log(driver_id);
    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "Driver ID is required",
      });
    }

    const result = await getDriverTotalEarning(driver_id);

    return res.status(200).json({
      status: true,
      message: "Driver total earning fetched successfully",
      driverEarning: {
        driver_id,
        total_earning: result.total_earning,
        total_bookings: result.total_bookings,
      },
    });
  } catch (error) {
    console.error("Driver Earning Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};
