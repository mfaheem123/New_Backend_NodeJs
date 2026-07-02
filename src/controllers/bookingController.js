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
  getBookingByCustomerId,
  getBookingByCustomerMobile,
  getScheduleBookingByCustomerId,
  checkDriverFobBooking,
  getFOBBookingHIstoryByDriverId,
  completeBoookingByController,
  updateDashboardBookingFares,
  recoverDashboardBooking,
  getCompletedBookingLogsByDriverId,
  getDriverEarningsStatistics,
  getBookingStatisticsData,
  getBookingStatisticsGraphData,
  getIncomeReportData,
  getDriverTodayEarning,
  getBookingsForCustomerInvoice,
  getBookingByReferenceNumber,
} = require("../models/bookingModel");
const Driver = require("../models/driverModel");
const {
  notifyBusyDriverUpdate,
  notifyDriverBookingStatusWeb,
} = require("../sockets/driverWebSocket");
const {
  notifyDriverBookingStatus,
} = require("../sockets/driverTrackingSocket");
const {
  sendBookingNotification,
  sendRideAcceptedNotification,
  sendRecoverBookingNotification,
  sendDriverRecoverBookingNotification,
  sendRejectRecoverBookingNotification
} = require("../services/notificationService");
const DriverShiftHistory = require("../models/driverShiftHistoryModel");

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

// ---------------------------------------------------------
// CREATE BOOKINGS CONTROLLER
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKINGS SECTIONS
// ---------------------------------------------------------
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
      company_id,
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
    AND b.booking_status_id IN (1, 13)
    AND b.trash = false
  `;
        orderBy = `
          TRIM(b.pickup_time)::time ASC,
          b.id ASC
        `;
        break;
      case 2:
        tabName = "PRE BOOKINGS";
        tabWhere = `DATE(b.pickup_date) > CURRENT_DATE AND b.booking_status_id NOT IN (11) AND b.trash = false`;
        break;

      case 3:
        tabName = "RECENT BOOKINGS";
        tabWhere = `b.booking_status_id NOT IN (1, 11, 13) AND b.trash = false`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
        break;

      case 4:
        tabName = "COMPLETED BOOKINGS";
        tabWhere = `b.booking_status_id = 11 AND b.trash = false`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
        break;

      case 5:
        tabName = "QUOTED BOOKINGS";
        tabWhere = `b.quoted = true AND b.trash = false`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
        break;

      case 6:
        tabName = "IVR BOOKINGS";
        tabWhere = `b.booking_source = 'ivr' AND b.trash = false`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
        break;

      case 7:
        tabName = "WEB BOOKINGS";
        tabWhere = `b.booking_source = 'web' AND b.trash = false`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
        break;

      case 8:
        tabName = "APP BOOKINGS";
        tabWhere = `b.booking_source = 'app'AND b.trash = false`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
        break;

      case 9:
        tabName = "MULTI BOOKINGS";
        tabWhere = `b.booking_type_id = 2 AND b.trash = false`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
        break;

      case 10:
        tabName = "PENDING BOOKINGS";
        tabWhere = `b.booking_status_id != 11`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
        break;

      case 11:
        tabName = "TRASH BOOKINGS";
        tabWhere = `b.trash = true`;
        orderBy = `
  (b.pickup_date::date + TRIM(b.pickup_time)::time) DESC
`;
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
        company_id,
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

// ---------------------------------------------------------
// GET BOOKING BY ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// UPDATE BOOKINGS BY ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// DELETE SINGLE BOOKING BY ID (TRASH MOVE)
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// BULK DELETE BOOKINGS (TRASH MOVE)
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// UPDATE BOOKING STATUS
// ---------------------------------------------------------
exports.updateBookingStatus = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { booking_status_id } = req.body;
    console.log(
      "🚀 INCOMING UPDATE BOOKING STATUS BODY:",
      JSON.stringify(req.body, null, 2),
    );

    if (!booking_status_id) {
      return res.status(400).json({
        status: false,
        message: "booking_status_id is required",
      });
    }

    const booking = await findBookingById(bookingId);
    console.log("Booking Details: ", booking.rows[0]);
    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    const driverId = booking.rows[0].driver_id;
    const customerId = booking.rows[0].customer_id;
    const booking_source = booking.rows[0].booking_source;
    console.log("Booking Source: ", booking_source);

    //RIDE ACCEPTED
    if (booking_status_id == 15) {
      await Driver.updateDriverStatus(driverId, "Accepted", "Unavailable");
      await notifyDriverBookingStatus(driverId);
      await notifyDriverBookingStatusWeb(driverId);
      if (booking_source == "app") {
        await sendRideAcceptedNotification(customerId, booking.rows[0]);
      }
    }

    // ON ROUTE
    if (booking_status_id == 3) {
      await updateBookingonRoute(bookingId, true, false, false);
      await Driver.updateDriverStatus(driverId, "On Route", "Unavailable");
      await notifyDriverBookingStatus(driverId);
      await notifyDriverBookingStatusWeb(driverId);
    }

    // ARRIVED
    if (booking_status_id == 6) {
      await updateBookingonRoute(bookingId, false, false, true);
      await Driver.updateDriverStatus(driverId, "Arrived", "Unavailable");
      await notifyDriverBookingStatus(driverId);
      await notifyDriverBookingStatusWeb(driverId);
    }

    // SOON TO CLEAR
    if (booking_status_id == 10) {
      await Driver.updateDriverStatus(driverId, "STC", "Unavailable");
      await notifyDriverBookingStatus(driverId);
      await notifyDriverBookingStatusWeb(driverId);
    }

    // COMPLETED
    if (booking_status_id == 11) {
      await updateBookingonRoute(bookingId, false, true, true);

      await Driver.updateDriverStatus(driverId, "Available", "Available");

      await notifyDriverBookingStatus(driverId);
      await notifyDriverBookingStatusWeb(driverId);

      const driver = await Driver.getById(driverId);

      notifyBusyDriverUpdate(driver);
      await DriverShiftHistory.addBookingToShift(driverId, bookingId);
    }

    // UPDATE BOOKING STATUS
    await updateBookingStatus(bookingId, booking_status_id);

    //GET FRESH DATA AFTER UPDATE
    const freshBooking = await findBookingById(bookingId);
    console.log("📦 Fresh Booking:", freshBooking.rows[0]);

    // -------------------------------
    // 📩 SEND SMS (AFTER UPDATE)
    // -------------------------------
    if (booking_status_id == 6) {
      console.log("📩 Sending ARRIVED SMS...");
      await sendBookingSMS(freshBooking.rows[0]);
    }

    // DRIVER UNAVAILABLE FOR THESE STATUS
    const booking_status_ids = Number(req.body.booking_status_id);
    console.log(booking_status_ids);

    const unavailableStatuses = [15];

    if (unavailableStatuses.includes(booking_status_ids)) {
      await Driver.updateDriverStatus(driverId, "Accepted", "Unavailable");

      const driver = await Driver.getById(driverId);
      console.log("📡 Sending BUSY_DRIVER_UPDATE:", driver.id);
      notifyBusyDriverUpdate(driver);
    }

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

// ---------------------------------------------------------
// UPDATE BOOKING FARES
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKING BY DRIVER ID
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKING BY DRIVER COMMISSION
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// CLONE ONE WAY BOOKING
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// CHECK BOOKING STATUS
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET BOOKING BY DRIVER ID AND STATUS
// ---------------------------------------------------------
exports.getBookingByDriverIdAndStatus = async (req, res) => {
  const { driver_id, booking_status_id } = req.body;

  if (!driver_id) {
    return res.status(400).json({
      status: false,
      message: "Driver ID Required",
    });
  }

  if (!booking_status_id) {
    return res.status(400).json({
      status: false,
      message: "Booking Status ID Required",
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

// ---------------------------------------------------------
// CHECK DRIVER ACTIVE BOOKING TODAY
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET CURRENT BOOKING
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// UPDATE BOOKING FARES CHARGES
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// GET DRIVER EARNING
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// ASSIGN DRIVER TO BOOKING (DISPATCH)
// ---------------------------------------------------------
exports.assignDriverToBooking = async (req, res) => {
  try {
    const { booking_id, driver_id } = req.body;

    console.log("🚀 ASSIGN DRIVER BODY:", req.body);

    if (!booking_id || !driver_id) {
      return res.status(400).json({
        status: false,
        message: "booking_id and driver_id are required",
      });
    }

    // Check booking exists
    const booking = await findBookingById(booking_id);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    // if (booking.rows[0].driver_id) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Driver already assigned",
    //   });
    // }

    if (
      booking.rows[0].booking_status_id === "11" ||
      booking.rows[0].booking_status_id === 11
    ) {
      return res.status(400).json({
        status: false,
        message: "Booking Already Completed",
      });
    }

    const driver = await Driver.getById(driver_id);

    if (driver.session_status === "logged_out") {
      return res.status(400).json({
        status: false,
        message: "Driver is Logged Out",
      });
    }

    if (
      driver.booking_status === "Unavailable" ||
      driver.driver_status === "Unavailable"
    ) {
      return res.status(400).json({
        status: false,
        message: "Driver is already busy",
      });
    }
    console.log("BOOKING DATA BEFORE ASSIGN DRIVER:", booking.rows[0]);
    // Call service
    const updatedBooking = await bookingService.assignDriverService(
      booking_id,
      driver_id,
    );

    return res.status(200).json({
      status: true,
      message: "Driver Assigned Successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Assign Driver Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// GET BOOKING BY CUSTOMER ID
// ---------------------------------------------------------
exports.getBookingByCustomerId = async (req, res) => {
  const customer_id = parseInt(req.params.id);
  // const lastdays = req.query.lastdays ? parseInt(req.query.lastdays) : null;

  const bookings = await getBookingByCustomerId(customer_id);

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

// ---------------------------------------------------------
// GET SCHEDULE BOOKING BY CUSTOMER ID
// ---------------------------------------------------------
exports.getScheduleBookingByCustomerId = async (req, res) => {
  const customer_id = parseInt(req.params.id);

  const bookings = await getScheduleBookingByCustomerId(customer_id);

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

// ---------------------------------------------------------
// GET BOOKING BY CUSTOMER MOBILE
// ---------------------------------------------------------
exports.getBookingByCustomerMobile = async (req, res) => {
  const { mobile, name } = req.query;

  const bookings = await getBookingByCustomerMobile(mobile, name);

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

// ---------------------------------------------------------
// ASSIGN FOLLOW ON BOOKING TO DRIVER
// ---------------------------------------------------------
exports.assignFOBBookingToDriver = async (req, res) => {
  try {
    const { booking_id, driver_id } = req.body;

    console.log("🚀 ASSIGN FOB BOOKING TO DRIVER BODY:", req.body);

    if (!booking_id || !driver_id) {
      return res.status(400).json({
        status: false,
        message: "booking_id and driver_id are required",
      });
    }

    // Check booking exists
    const booking = await findBookingById(booking_id);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    // if (booking.rows[0].driver_id) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Driver already assigned",
    //   });
    // }

    if (
      booking.rows[0].booking_status_id === "11" ||
      booking.rows[0].booking_status_id === 11
    ) {
      return res.status(400).json({
        status: false,
        message: "Booking Already Completed",
      });
    }

    const driver = await Driver.getById(driver_id);

    if (driver.session_status === "logged_out") {
      return res.status(400).json({
        status: false,
        message: "Driver is Logged Out",
      });
    }

    if (
      driver.session_status === "logged_in" &&
      (driver.booking_status === "Available" ||
        driver.driver_status === "Available")
    ) {
      return res.status(400).json({
        status: false,
        message: "FOB can only be assigned to a busy driver",
      });
    }

    // Assign FOB Booking to Driver
    const updatedBooking = await bookingService.assignFOBDriverService(
      booking_id,
      driver_id,
    );

    return res.status(200).json({
      status: true,
      message: "Driver Assigned Successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Assign Driver Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// GET BOOKING BY DRIVER ID AND FOB BOOKING
// ---------------------------------------------------------
exports.getBookingByDriverIdAndFob = async (req, res) => {
  const driverId = parseInt(req.params.id);

  if (!driverId) {
    return res.status(400).json({
      status: false,
      message: "Driver ID Required",
    });
  }

  const booking = await checkDriverFobBooking(driverId);

  // ❌ No active FOB booking
  if (!booking) {
    return res.status(200).json({
      success: true,
      fob: false,
      booking_id: null,
    });
  }

  // ✅ Active FOB booking found
  const data = parseJSONFields(booking);

  return res.status(200).json({
    success: true,
    fob: true,
    booking_id: booking.id,
    // booking: data,
  });
};

// ---------------------------------------------------------
// GET FOB BOOKING HISTORY BY DRIVER ID
// ---------------------------------------------------------
exports.getFOBBookingHIstoryByDriverId = async (req, res) => {
  const driver_id = req.params.id;

  if (!driver_id) {
    return res.status(400).json({
      status: false,
      message: "Driver ID Required",
    });
  }

  const bookings = await getFOBBookingHIstoryByDriverId(driver_id);

  if (!bookings || bookings.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No FOB bookings found for this driver",
    });
  }

  const data = bookings.map((b) => parseJSONFields(b));

  res.status(200).json({
    success: true,
    count: bookings.length,
    bookings: data,
  });
};

// ---------------------------------------------------------
// COMPLETE BOOKING BY CONTROLLER
// ---------------------------------------------------------
exports.completeBoookingByController = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { driver_id } = req.body;
    console.log(
      "🚀 INCOMING CONTROLLER BOOKING COMPLETE BODY:",
      JSON.stringify(req.body, null, 2),
    );
    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "Driver_ID is Required",
      });
    }

    const booking = await findBookingById(bookingId);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    await completeBoookingByController(bookingId, driver_id);

    return res.status(200).json({
      status: true,
      message: "Booking Completed successfully",
    });
  } catch (error) {
    console.error("Error While Booking Completed:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// UPDATE DASHBOARD BOOKING FARES
// ---------------------------------------------------------
exports.updateDashboardBookingFares = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { total_charges } = req.body;
    console.log(
      "🚀 INCOMING UPDATE BOOKING CHARGES BODY:",
      JSON.stringify(req.body, null, 2),
    );
    if (!total_charges) {
      return res.status(400).json({
        status: false,
        message: "Fare Required",
      });
    }

    const booking = await findBookingById(bookingId);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    await updateDashboardBookingFares(bookingId, total_charges);

    return res.status(200).json({
      status: true,
      message: "Booking Fares updated successfully",
    });
  } catch (error) {
    console.error("Update Booking Fares Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// RECOVER DASHBOARD BOOKING
// ---------------------------------------------------------
exports.recoverDashboardBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const bookingResult = await findBookingById(bookingId);

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }
    // ✅ Actual booking object
    const booking = bookingResult.rows[0];

    console.log("BOOKING:", booking);
    console.log(booking.id);
    await sendRecoverBookingNotification(booking.driver_id, booking);
    await recoverDashboardBooking(bookingId);
    await Driver.updateDriverStatus(
      booking.driver_id,
      "Available",
      "Available",
    );
    await notifyDriverBookingStatus(booking.driver_id);
    await notifyDriverBookingStatusWeb(booking.driver_id);

    const driver = await Driver.getById(booking.driver_id);

    notifyBusyDriverUpdate(driver);
    return res.status(200).json({
      status: true,
      message: "Recover Booking Successfully",
    });
  } catch (error) {
    console.error("Recover Booking Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// GET COMPLETED BOOKING LOGS BY DRIVER ID
// ---------------------------------------------------------
exports.getCompletedBookingLogsByDriverId = async (req, res) => {
  try {
    const {
      driver_id,
      from_date,
      to_date,
      from_time,
      to_time,

      // SEARCH FILTERS
      ref,
      vehicle,
      pickup,
      dropoff,
      fares,
      datetime,
    } = req.query;

    const bookings = await getCompletedBookingLogsByDriverId(driver_id, {
      from_date,
      to_date,
      from_time,
      to_time,

      ref,
      vehicle,
      pickup,
      dropoff,
      fares,
      datetime,
    });

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
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------------------------------------------------
// GET DRIVER EARNNG AND INFO
// ---------------------------------------------------------
exports.getDriverEarningsStatistics = async (req, res) => {
  try {
    const { view, date, from_date, to_date, driver_id } = req.query;

    const result = await getDriverEarningsStatistics({
      view,
      date,
      from_date,
      to_date,
      driver_id,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------------------------------------------------
// ASSIGN FUTURE BOOKING TO DRIVER
// ---------------------------------------------------------
exports.assignFutureBookingToDriver = async (req, res) => {
  try {
    const { booking_id, driver_id } = req.body;

    console.log("🚀 ASSIGN FUTURE BOOKING TO DRIVER BODY:", req.body);

    if (!booking_id || !driver_id) {
      return res.status(400).json({
        status: false,
        message: "booking_id and driver_id are required",
      });
    }

    // Check booking exists
    const booking = await findBookingById(booking_id);

    if (booking.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }

    // if (booking.rows[0].driver_id) {
    //   return res.status(400).json({
    //     status: false,
    //     message: "Driver already assigned",
    //   });
    // }

    if (
      booking.rows[0].booking_status_id === "11" ||
      booking.rows[0].booking_status_id === 11
    ) {
      return res.status(400).json({
        status: false,
        message: "Booking Already Completed",
      });
    }

    const driver = await Driver.getById(driver_id);

    if (driver.session_status === "logged_out") {
      return res.status(400).json({
        status: false,
        message: "Driver is Logged Out",
      });
    }

    // Assign FOB Booking to Driver
    const updatedBooking =
      await bookingService.assignFutureBookingDriverService(
        booking_id,
        driver_id,
      );

    return res.status(200).json({
      status: true,
      message: "Driver Assigned Successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Assign Driver Error:", error);

    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};

// ---------------------------------------------------------
// GET ALL BOOKING STATISTICS
// ---------------------------------------------------------
exports.getBookingStatistics = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,

      from_date,
      to_date,

      from_time,
      to_time,

      booking_status_id,
      payment_type_id,

      customer,
      mobile,
      telephone,

      account_id,
      department,

      order_number,
      booked_by,

      employee_id,
      subsidiary_id,

      reference_number,
      pickup,
      dropoff,

      sort_by = "datetime",
      sort_order = "ASC",
    } = req.query;

    const result = await getBookingStatisticsData({
      page: Number(page),
      limit: Number(limit),

      filters: {
        from_date,
        to_date,
        from_time,
        to_time,

        booking_status_id,
        payment_type_id,

        customer,
        mobile,
        telephone,

        account_id,
        department,

        order_number,
        booked_by,

        employee_id,
        subsidiary_id,

        reference_number,
        pickup,
        dropoff,

        sort_by,
        sort_order,
      },
    });

    const data = result.rows.map(parseJSONFields);

    res.json({
      success: true,
      page: Number(page),
      limit: Number(limit),
      total: result.total,
      total_pages: Math.ceil(result.total / limit),
      count: data.length,

      totals: result.totals,

      data,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------------------------------------------------
// GET BOOKING STATISTICS GRAPH DATA
// ---------------------------------------------------------
exports.getBookingStatisticsGraph = async (req, res) => {
  try {
    const {
      from_date,
      to_date,
      booking_status_id,
      payment_type_id,
      subsidiary_id,
    } = req.query;

    const result = await getBookingStatisticsGraphData({
      from_date,
      to_date,
      booking_status_id,
      payment_type_id,
      subsidiary_id,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------------------------------------------------
// GET INCOME REPORT DATA
// ---------------------------------------------------------
exports.getIncomeReport = async (req, res) => {
  try {
    const {
      from_date,
      to_date,

      driver_id,
      account_id,
      subsidiary_id,

      payment_type_id, // 1,2,3
    } = req.query;

    const result = await getIncomeReportData({
      from_date,
      to_date,
      driver_id,
      account_id,
      subsidiary_id,
      payment_type_id,
    });

    res.json({
      success: true,
      total_bookings: result.total_bookings,
      total_earnings: result.total_earnings,
      bookings: result.rows,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ---------------------------------------------------------
// GET DRIVER TODAY EARNING
// ---------------------------------------------------------
exports.getDriverTodayEarning = async (req, res) => {
  try {
    const driver_id = req.params.id;

    if (!driver_id) {
      return res.status(400).json({
        status: false,
        message: "Driver ID is required",
      });
    }

    const result = await getDriverTodayEarning(driver_id);

    return res.status(200).json({
      status: true,
      message: "Driver Today Earning Fetched Successfully",
      driverEarning: {
        driver_id,
        today_earning: result.today_earning,
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

// ---------------------------------------------------------
// GET BOOKINGS FOR CUSTOMER INVOICE
// ---------------------------------------------------------
exports.getBookingsForCustomerInvoice = async (req, res) => {
  try {
    let { customer_id, from_date, to_date, payment_type_ids } = req.query;

    if (!customer_id) {
      return res.status(400).json({
        status: false,
        message: "customer_id is required",
      });
    }

    if (!from_date || !to_date) {
      return res.status(400).json({
        status: false,
        message: "from_date and to_date are required",
      });
    }

    if (typeof payment_type_ids === "string") {
      payment_type_ids = JSON.parse(payment_type_ids);
    }

    payment_type_ids = payment_type_ids.map(Number);

    if (
      !payment_type_ids ||
      !Array.isArray(payment_type_ids) ||
      payment_type_ids.length === 0
    ) {
      return res.status(400).json({
        status: false,
        message: "payment_type_ids must be a non-empty array",
      });
    }

    const bookings = await getBookingsForCustomerInvoice(
      customer_id,
      from_date,
      to_date,
      payment_type_ids,
    );

    return res.status(200).json({
      status: true,
      total_records: bookings.length,
      bookings,
    });
  } catch (error) {
    console.error("Get Customer Invoice Bookings Error:", error);

    return res.status(500).json({
      status: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// CHECK BOOKING STATUS CUSTOMER APP
// ---------------------------------------------------------
exports.checkBookingStatusCustomer = async (req, res) => {
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
      booking.booking_status_id === 11 || booking.booking_status_id === "11";

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

// ---------------------------------------------------------
// GET BOOKING BY REFERENCE NUMBER
// ---------------------------------------------------------
exports.getBookingByReferenceNumber = async (req, res) => {
  const { reference_number } = req.query;
  console.log(
    "🚀 INCOMING GET BOOKING BODY:",
    JSON.stringify(req.query, null, 2),
  );

  const booking = await getBookingByReferenceNumber(reference_number);

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


// ---------------------------------------------------------
// SEND RECOVER BOOKING NOTIFICATION TO DASHBOARD FROM DRIVER
// ---------------------------------------------------------
exports.recoverDriverBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const bookingResult = await findBookingById(bookingId);

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }
    // ✅ Actual booking object
    const booking = bookingResult.rows[0];

    console.log("BOOKING:", booking);
    console.log(booking.id);
    await sendDriverRecoverBookingNotification(booking);
    
    return res.status(200).json({
      status: true,
      message: "Send Recover Booking Request to Web Successfully",
    });
  } catch (error) {
    console.error("Recover Booking Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};


// ---------------------------------------------------------
// RECOVER DASHBOARD BOOKING
// ---------------------------------------------------------
exports.rejectRecoverBooking = async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);

    const bookingResult = await findBookingById(bookingId);

    if (bookingResult.rowCount === 0) {
      return res.status(404).json({
        status: false,
        message: "Booking not found",
      });
    }
    // ✅ Actual booking object
    const booking = bookingResult.rows[0];

    console.log("BOOKING:", booking);
    console.log(booking.id);
    await sendRejectRecoverBookingNotification(booking.driver_id, booking);
    return res.status(200).json({
      status: true,
      message: "Driver Recover Booking Reject Successfully",
    });
  } catch (error) {
    console.error("Driver Recover Booking Reject Error:", error);
    return res.status(500).json({
      status: false,
      message: "Internal Server Error",
    });
  }
};