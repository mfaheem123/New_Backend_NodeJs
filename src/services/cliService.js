const CustomerModel = require("../models/customerModel");
const BookingModel = require("../models/bookingModel");

const getViaSignature = (booking) => {
  if (!booking.viapoints || booking.viapoints.length === 0) {
    return "NO_VIA";
  }

  // assuming viapoints is array OR string
  if (Array.isArray(booking.viapoints)) {
    return "VIA:" + booking.viapoints.sort().join("|");
  }

  return "VIA:" + String(booking.viapoints).trim();
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

const parseJSONField = (field) => {
  if (!field) return [];
  if (typeof field === "object") return field;
  try {
    return JSON.parse(field);
  } catch (err) {
    return [];
  }
};

const formatBookingList = (bookings) => {
  return deduplicateBookings(bookings).map((b) => ({
    ...b,
    viapoints: parseJSONField(b.viapoints),
    restricted_drivers: parseJSONField(b.restricted_drivers),
    child_seat: parseJSONField(b.child_seat),
    notes: parseJSONField(b.notes),
    skipped_bookings: parseJSONField(b.skipped_bookings),
  }));
};

/**
 * Safe YYYY-MM-DD Formatter for dates like "2026-7-22" or ISO strings
 */
const getYYYYMMDD = (dateInput) => {
  if (!dateInput) return "";

  // Agar string format "YYYY-M-D" ho to direct pad end/start karein
  if (typeof dateInput === "string" && dateInput.includes("-")) {
    const parts = dateInput.split("-");
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, "0");
      const day = parts[2].substring(0, 2).padStart(2, "0"); // Handles "22T00:00:00" if present
      return `${year}-${month}-${day}`;
    }
  }

  // Fallback for Date objects or ISO strings
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
};


/**
 * Find customer & last 15 days unique bookings (Max 5 Latest)
 */
// const findCustomerByPhone = async (phone, companyId) => {
//   const cleanPhone = phone.replace(/\s+/g, "");
//   // 1️⃣ Find customer
//   const customers = await CustomerModel.searchByMobile(cleanPhone, companyId);

//   if (!customers || customers.length === 0) {
//     return {
//       is_new: true,
//     };
//   }

//   const customer = customers[0];

//   // 2️⃣ Fetch completed bookings of last 15 days
//   const allCompleted = await BookingModel.getCompletedBookings();

//   const last15Days = allCompleted.filter((b) => {
//     if (!b.pickup_date) return false;

//     const pickupDate = new Date(b.pickup_date);
//     const diffDays =
//       (Date.now() - pickupDate.getTime()) / (1000 * 60 * 60 * 24);

//     return diffDays <= 15 && b.customer_id === customer.id;
//   });

//   const parseJSONField = (field) => {
//     if (!field) return [];

//     if (typeof field === "object") return field; // already parsed

//     try {
//       return JSON.parse(field);
//     } catch (err) {
//       return [];
//     }
//   };

//   // 3️⃣ Deduplicate, Sort (Latest First) & Limit to Top 5
//   const uniqueBookings = deduplicateBookings(last15Days)
//     .sort((a, b) => new Date(b.pickup_date) - new Date(a.pickup_date)) // Latest pehle aye gi
//     .slice(0, 5) // Maximum 5 bookings filter hon gi
//     .map((b) => ({
//       ...b,
//       viapoints: parseJSONField(b.viapoints),
//       restricted_drivers: parseJSONField(b.restricted_drivers),
//       child_seat: parseJSONField(b.child_seat),
//       notes: parseJSONField(b.notes),
//       skipped_bookings: parseJSONField(b.skipped_bookings),
//     }));

//   // 4️⃣ Ride history data
//   const [totalUsed, totalCancelled, totalAmount] = await Promise.all([
//     BookingModel.getTotalBookingsByCustomer(customer.id),
//     BookingModel.getCancelledBookingsByCustomer(customer.id),
//     BookingModel.getTotalAmountByCustomer(customer.id),
//   ]);

//   return {
//     is_new: false,
//     customer,
//     bookings: uniqueBookings,
//     ride_history: {
//       used: totalUsed,
//       cancelled: totalCancelled,
//       balance_amount: totalAmount,
//     },
//   };
// };

/**
 * Find customer & categorized bookings (Current, Past, Quoted) + Screen Stats
 */
const findCustomerByPhone = async (phone, companyId) => {
  const cleanPhone = phone.replace(/\s+/g, "");

  // 1️⃣ Find customer
  const customers = await CustomerModel.searchByMobile(cleanPhone, companyId);

  if (!customers || customers.length === 0) {
    return {
      is_new: true,
    };
  }

  const rawCustomer = customers[0];

  // 2️⃣ Map customer data
  const customer = {
    id: rawCustomer.id,
    sms_flag: rawCustomer.sms_flag ?? true,
    name: rawCustomer.name || rawCustomer.full_name || "",
    mobile: rawCustomer.mobile || rawCustomer.phone || cleanPhone,
    email: rawCustomer.email || "",
    telephone: rawCustomer.telephone || rawCustomer.landline || "",
  };

  // 3️⃣ Fetch raw bookings & aggregated stats concurrently
  const [rawBookings, stats] = await Promise.all([
    BookingModel.getCustomerBookingsAndStats(customer.id),
    BookingModel.getCustomerBookingStats(customer.id),
  ]);

  // 4️⃣ Date comparisons setup
  const todayStr = getYYYYMMDD(new Date());

  // Current Bookings: Today's Date
  const currentRaw = rawBookings.filter((b) => {
    if (!b.pickup_date) return false;
    const bookingDateStr = getYYYYMMDD(b.pickup_date);
    return bookingDateStr === todayStr;
  });

  // Past Bookings: Completed Status (11) AND Date is before Today
  const pastRaw = rawBookings.filter((b) => {
    if (!b.pickup_date || b.booking_status_id !== 11) return false;
    const bookingDateStr = getYYYYMMDD(b.pickup_date);
    return bookingDateStr < todayStr;
  });

  // Quoted Bookings: quoted is true
  const quotedRaw = rawBookings.filter((b) => b.quoted === true);

  // 5️⃣ Deduplicate, Sort & Apply Max 10 Limit for Past & Quoted
  const formattedCurrent = formatBookingList(currentRaw);

  const formattedPast = formatBookingList(pastRaw)
    .sort((a, b) => new Date(b.pickup_date) - new Date(a.pickup_date)) // Latest past first
    .slice(0, 10); // Max 10 bookings

  const formattedQuoted = formatBookingList(quotedRaw)
    .sort((a, b) => new Date(b.pickup_date) - new Date(a.pickup_date)) // Latest quoted first
    .slice(0, 10); // Max 10 bookings

  // 6️⃣ Return final response structure
  return {
    is_new: false,
    customer,
    bookings: {
      current: formattedCurrent,
      past: formattedPast,
      quoted: formattedQuoted,
    },
    stats: {
      total: stats.total_bookings || 0,
      current: stats.current_bookings || 0,
      completed: stats.completed_bookings || 0,
      cancelled: stats.cancelled_bookings || 0,
      quoted: stats.quoted_bookings || 0,
    },
  };
};

module.exports = {
  findCustomerByPhone,
};
