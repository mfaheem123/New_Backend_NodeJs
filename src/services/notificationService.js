const admin = require("../config/firebase"); // firebase-admin init
const pool = require("../db");

async function sendBookingNotification(driverId, booking) {
  // 1️⃣ Driver ka FCM token lao
  const res = await pool.query(`SELECT fcm_token FROM drivers WHERE id = $1`, [
    driverId,
  ]);

  const fcmToken = res.rows[0]?.fcm_token;
  if (!fcmToken) {
    console.log("⚠️ No FCM token for driver:", driverId);
    return;
  }

  const bookingPayload = { ...booking };

  // 2️⃣ Notification payload
  const message = {
    token: fcmToken,
    notification: {
      title: "New Booking Assigned",
      body: `Pickup: ${booking.pickup}`,
    },
    data: {
      booking: JSON.stringify(bookingPayload),
      booking_id: booking.id,
      type: "NEW_BOOKING",
    },
  };

  // 3️⃣ Send
  await admin.messaging().send(message);
  console.log("✅ Notification sent to driver:", driverId);
}

async function sendRideAcceptedNotification(customerId, booking) {
  // 1️⃣ Customer ka FCM token lao
  const res = await pool.query(
    `SELECT fcm_token FROM customers WHERE id = $1`,
    [customerId],
  );

  const fcmToken = res.rows[0]?.fcm_token;
  if (!fcmToken) {
    console.log("⚠️ No FCM token for customer:", customerId);
    return;
  }

  // 2️⃣ Payload
  const message = {
    token: fcmToken,
    notification: {
      title: "Ride Accepted 🚗",
      body: `Driver is on the way. Pickup: ${booking.pickup}`,
    },
    data: {
      booking: JSON.stringify(booking),
      booking_id: booking.id,
      type: "RIDE_ACCEPTED",
    },
  };

  // 3️⃣ Send
  await admin.messaging().send(message);
  console.log("✅ Notification sent to customer:", customerId);
}

module.exports = {
  sendBookingNotification,
};
