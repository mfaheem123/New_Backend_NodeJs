const CustomerModel = require("../models/customerModel");
const BookingModel = require("../models/bookingModel");

const getViaSignature = (booking) => {
  if (!booking.via || booking.via.length === 0) {
    return "NO_VIA";
  }

  // assuming via is array OR string
  if (Array.isArray(booking.via)) {
    return "VIA:" + booking.via.sort().join("|");
  }

  return "VIA:" + String(booking.via).trim();
};

/**
 * Deduplicate bookings based on rules
 */
const deduplicateBookings = (bookings) => {
  const map = new Map();

  for (const booking of bookings) {
    const pickup = booking.pickup?.trim().toLowerCase() || "";
    const dropoff = booking.dropoff?.trim().toLowerCase() || "";
    const viaSignature = getViaSignature(booking);

    const key = `${pickup}__${dropoff}__${viaSignature}`;

    // keep latest booking for same key
    if (!map.has(key)) {
      map.set(key, booking);
    }
  }

  return Array.from(map.values());
};

/**
 * Find customer & last 15 days unique bookings
 */
const findCustomerByPhone = async (phone) => {
  const cleanPhone = phone.replace(/\s+/g, "");
const companyId = 1;
  // 1️⃣ Find customer
  const customers = await CustomerModel.searchByMobile(cleanPhone,companyId);

  if (!customers || customers.length === 0) {
    return {
      is_new: true,
    };
  }

  const customer = customers[0];

  // 2️⃣ Fetch completed bookings of last 15 days
  const allCompleted = await BookingModel.getCompletedBookings();

  const last15Days = allCompleted.filter((b) => {
    if (!b.pickup_date) return false;

    const pickupDate = new Date(b.pickup_date);
    const diffDays =
      (Date.now() - pickupDate.getTime()) / (1000 * 60 * 60 * 24);

    return diffDays <= 15 && b.customer_id === customer.id;
  });

  const parseJSONField = (field) => {
    if (!field) return [];

    if (typeof field === "object") return field; // already parsed

    try {
      return JSON.parse(field);
    } catch (err) {
      return [];
    }
  };

  // 3️⃣ Deduplicate
  const uniqueBookings = deduplicateBookings(last15Days).map((b) => ({
    ...b,
    viapoints: parseJSONField(b.viapoints),
    restricted_drivers: parseJSONField(b.restricted_drivers),
    child_seat: parseJSONField(b.child_seat),
    notes: parseJSONField(b.notes),
    skipped_bookings: parseJSONField(b.skipped_bookings),
  }));
  // 4️⃣ Ride history data
  const [totalUsed, totalCancelled, totalAmount] = await Promise.all([
    BookingModel.getTotalBookingsByCustomer(customer.id),
    BookingModel.getCancelledBookingsByCustomer(customer.id),
    BookingModel.getTotalAmountByCustomer(customer.id),
  ]);

  return {
    is_new: false,
    customer,
    bookings: uniqueBookings,
    ride_history: {
      used: totalUsed,
      cancelled: totalCancelled,
      balance_amount: totalAmount,
    },
  };
};

module.exports = {
  findCustomerByPhone,
};
