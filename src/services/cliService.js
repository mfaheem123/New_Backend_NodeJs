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

  // 1️⃣ Find customer
  const customers = await CustomerModel.searchByMobile(cleanPhone);

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

  // 3️⃣ Deduplicate
  const uniqueBookings = deduplicateBookings(last15Days);

  return {
    is_new: false,
    customer,
    bookings: uniqueBookings,
  };
};

module.exports = {
  findCustomerByPhone,
};
