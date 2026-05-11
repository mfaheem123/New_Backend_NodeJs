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
  console.log("Booking_ID: ", booking.id);
  console.log("Driver_ID: ", booking.driver_id);

  // 2️⃣ Payload
  const message = {
    token: fcmToken,
    notification: {
      title: "Ride Accepted",
      body: `Driver is on the way. Pickup: ${booking.pickup}`,
    },
    data: {
      // booking: JSON.stringify(booking),
      booking_id: booking.id.toString(),
      driver_id: booking.driver_id.toString(),
      type: "RIDE_ACCEPTED",
    },
  };

  // 3️⃣ Send
  await admin.messaging().send(message);
  console.log("✅ Notification sent to customer:", customerId);
}

async function sendFOBBookingNotification(driverId, booking) {
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
      title: "New Follow On Booking Assigned",
      body: `Pickup: ${booking.pickup}`,
    },
    data: {
      // booking: JSON.stringify(bookingPayload),
      booking_status: "fob",
      booking_id: booking.id.toString(),
      type: "FOB_BOOKING",
    },
  };

  // 3️⃣ Send
  await admin.messaging().send(message);
  console.log("✅ FOB Notification sent to driver:", driverId);
}

async function sendPanicDriverNotification(driverId) {
  try {
    // 1️⃣ Sare controllers ke web_device_id lao
    const res = await pool.query(`
      SELECT web_device_id
      FROM employees
      WHERE role_id = 1
      AND web_device_id IS NOT NULL
      AND web_device_id != ''
    `);

    // 2️⃣ Tokens array banao
    const tokens = res.rows.map(row => row.web_device_id);

    if (tokens.length === 0) {
      console.log("⚠️ No FCM tokens found");
      return;
    }

    const driverRes = await pool.query(`
  SELECT name, username
      FROM drivers
      WHERE id = $1`, [
    driverId,
  ])

  const driver_name = driverRes.rows[0]?.name;
    // 3️⃣ Notification payload
    const message = {
      tokens: tokens,
      notification: {
        title: "ALERT! Driver is On Panic",
        body: `Driver: ${driver_name}`,
      },
      data: {
        driver_status: "panic",
        driver_id: driverId.toString(),
        type: "PANIC_DRIVER",
      },
    };

    // 4️⃣ Send notification to all
    const response = await admin
      .messaging()
      .sendEachForMulticast(message);

    console.log(`✅ Notifications sent: ${response.successCount}`);
    console.log(`❌ Failed: ${response.failureCount}`);

  } catch (error) {
    console.error("❌ Error sending panic notification:", error);
  }
}

async function sendOnBreakDriverNotification(driverId) {
  try {
    // 1️⃣ Sare controllers ke web_device_id lao
    const res = await pool.query(`
      SELECT web_device_id
      FROM employees
      WHERE role_id = 1
      AND web_device_id IS NOT NULL
      AND web_device_id != ''
    `);

    // 2️⃣ Tokens array banao
    const tokens = res.rows.map(row => row.web_device_id);

    if (tokens.length === 0) {
      console.log("⚠️ No FCM tokens found");
      return;
    }

    const driverRes = await pool.query(`
  SELECT name, username
      FROM drivers
      WHERE id = $1`, [
    driverId,
  ])

  const driver_name = driverRes.rows[0]?.name;
    // 3️⃣ Notification payload
    const message = {
      tokens: tokens,
      notification: {
        title: "Driver Wants Break",
        body: `Driver: ${driver_name}`,
      },
      data: {
        driver_status: "on break",
        driver_id: driverId.toString(),
        type: "DRIVER_BREAK",
      },
    };

    // 4️⃣ Send notification to all
    const response = await admin
      .messaging()
      .sendEachForMulticast(message);

    console.log(`✅ Notifications sent: ${response.successCount}`);
    console.log(`❌ Failed: ${response.failureCount}`);

  } catch (error) {
    console.error("❌ Error sending panic notification:", error);
  }
}

module.exports = {
  sendBookingNotification,
  sendFOBBookingNotification,
  sendRideAcceptedNotification,
  sendPanicDriverNotification,
  sendOnBreakDriverNotification,
};
