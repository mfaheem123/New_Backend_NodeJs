const CustomerModel = require("../models/customerModel");
const BookingModel = require("../models/bookingModel");

/**
 * Find customer by incoming phone number
 */
const findCustomerByPhone = async (phone) => {
  // 🔹 normalize number (recommended)
  const cleanPhone = phone.replace(/\s+/g, "");

  // 1️⃣ search customer
  const customers = await CustomerModel.searchByMobile(cleanPhone);

  if (!customers || customers.length === 0) {
    return {
      is_new: true,
    };
  }

  const customer = customers[0];

  // 2️⃣ recent completed bookings
  const bookings = await BookingModel.getCompletedBookings();

  // Filter only this customer & take last 5
  const recentBookings = bookings
    .filter((b) => b.customer_id === customer.id)
    .slice(0, 5);

  return {
    is_new: false,
    customer,
    recent_bookings: recentBookings,
  };
};

module.exports = {
  findCustomerByPhone,
};
