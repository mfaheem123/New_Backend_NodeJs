const admin = require("../config/firebase"); // firebase-admin init
const pool = require("../db");

// ---------------------------------------------------------
// SEND BOOKING NOTIFICATION TO DRIVER
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// SEND RIDE ACCEPTED NOTIFICATION TO CUSTOMER
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// SEND FOLLOW ON BOOKING NOTIFICATION TO DRIVER
// ---------------------------------------------------------
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

// ---------------------------------------------------------
// SEND PANIC NOTIFICATION TO DASHBOARD
// ---------------------------------------------------------
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
    const tokens = res.rows.map((row) => row.web_device_id);

    if (tokens.length === 0) {
      console.log("⚠️ No FCM tokens found");
      return;
    }

    const driverRes = await pool.query(
      `
  SELECT name, username, mobile
      FROM drivers
      WHERE id = $1`,
      [driverId],
    );

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
        driver_username: driverRes.rows[0]?.username,
        driver_name: driverRes.rows[0]?.name,
        driver_mobile: driverRes.rows[0]?.mobile,
        type: "PANIC_DRIVER",
      },
    };
    console.log("Notification Data:", message);
    // 4️⃣ Send notification to all
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Notifications sent: ${response.successCount}`);
    console.log(`❌ Failed: ${response.failureCount}`);
  } catch (error) {
    console.error("❌ Error sending panic notification:", error);
  }
}

// ---------------------------------------------------------
// SEND ON BREAK NOTIFICATION TO DASHBOARD
// ---------------------------------------------------------
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
    const tokens = res.rows.map((row) => row.web_device_id);

    if (tokens.length === 0) {
      console.log("⚠️ No FCM tokens found");
      return;
    }

    const driverRes = await pool.query(
      `
  SELECT name, username, mobile
      FROM drivers
      WHERE id = $1`,
      [driverId],
    );

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
        driver_username: driverRes.rows[0]?.username,
        driver_name: driverRes.rows[0]?.name,
        driver_mobile: driverRes.rows[0]?.mobile,
        type: "DRIVER_BREAK_WEB",
      },
    };
    console.log("Notification Data:", message);

    // 4️⃣ Send notification to all
    const response = await admin.messaging().sendEachForMulticast(message);

    console.log(`✅ Notifications sent: ${response.successCount}`);
    console.log(`❌ Failed: ${response.failureCount}`);
  } catch (error) {
    console.error("❌ Error sending panic notification:", error);
  }
}

// ---------------------------------------------------------
// SEND BREAK STATUS NOTIFICATION TO DRIVER
// ---------------------------------------------------------
async function sendBreakStatusNotification(driverId, break_status) {
  // Driver Token
  const res = await pool.query(`SELECT * FROM drivers WHERE id = $1`, [
    driverId,
  ]);

  const fcmToken = res.rows[0]?.fcm_token;

  if (!fcmToken) {
    console.log("⚠️ No FCM token for driver:", driverId);
    return;
  }

  // Dynamic Message
  let title = "";
  let body = "";

  if (break_status === "accepted" || break_status === "Accepted") {
    title = "Break Accepted";
    body = "Your break request has been accepted";
  } else {
    title = "Break Rejected";
    body = "Your break has been rejected";
  }

  // Notification Payload
  const message = {
    token: fcmToken,

    notification: {
      title,
      body,
    },

    data: {
      driver_id: driverId.toString(),
      type: "BREAK_STATUS",
      break_status: break_status,
    },
  };
  console.log("Notification Data:", message);
  // Send Notification
  await admin.messaging().send(message);

  console.log("✅ Break Status Notification sent to driver:", driverId);
}

// ---------------------------------------------------------
// SEND RECOVER BOOKING NOTIFICATION TO DRIVER
// ---------------------------------------------------------
async function sendRecoverBookingNotification(driverId, booking) {
  // 1️⃣ Driver ka FCM token lao
  const res = await pool.query(`SELECT fcm_token FROM drivers WHERE id = $1`, [
    driverId,
  ]);

  const fcmToken = res.rows[0]?.fcm_token;
  if (!fcmToken) {
    console.log("⚠️ No FCM token for driver:", driverId);
    return;
  }

  // 2️⃣ Notification payload
  const message = {
    token: fcmToken,
    notification: {
      title: "Booking Recover From Controller",
      // body: `Pickup: ${booking.pickup}`,
    },
    data: {
      booking_id: booking.id.toString(),
      type: "RECOVER_BOOKING",
    },
  };

  // 3️⃣ Send
  await admin.messaging().send(message);
  console.log("✅ Notification sent to driver:", driverId);
}

async function sendAppBookingNotification(booking) {
  try {
    // ✅ Sirf APP bookings ke liye
    if (
      !booking.booking_source ||
      booking.booking_source.toUpperCase() !== "APP"
    ) {
      return;
    }

    // ==============================
    // ASAP YA SCHEDULE CHECK
    // ==============================

    let bookingType = "SCHEDULE";

    try {
      const now = new Date();

      const pickupDateTime = new Date(
        `${booking.pickup_date} ${booking.pickup_time}`,
      );

      // Agar booking next 10 minutes ke andar hai => ASAP
      const diffMinutes = (pickupDateTime - now) / (1000 * 60);

      if (diffMinutes <= 10) {
        bookingType = "ASAP";
      }
    } catch (err) {
      console.log("❌ Error detecting booking type:", err);
    }

    // ==============================
    // DASHBOARD TOKENS
    // ==============================

    const res = await pool.query(`
      SELECT web_device_id
      FROM employees
      WHERE role_id = 1
      AND web_device_id IS NOT NULL
      AND web_device_id != ''
    `);

    const tokens = res.rows.map((r) => r.web_device_id);

    if (tokens.length === 0) {
      console.log("⚠️ No dashboard FCM tokens found");
      return;
    }

    // ==============================
    // NOTIFICATION PAYLOAD
    // ==============================

    const message = {
      tokens,

      notification: {
        title: `New ${bookingType} App Booking`,
        body: `${booking.pickup} → ${booking.dropoff}`,
      },

      data: {
        type: "NEW_APP_BOOKING",
        booking_mode: bookingType,
        // booking_id: String(booking.id),
        booking_id: "1234",
        // booking: JSON.stringify(booking),
      },
    };

    // ==============================
    // SEND
    // ==============================
    console.log("App Booking Notification Data:", message);
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("FCM RESPONSE:", JSON.stringify(response, null, 2));
    console.log(
      `✅ App booking notification sent: ${response.successCount} success`,
    );
  } catch (err) {
    console.error("❌ sendAppBookingNotification Error:", err);
  }
}

async function sendFutureBookingNotification(driverId, booking) {
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

async function sendWebBookingNotification(booking) {
  try {
    // ✅ Sirf WEB bookings ke liye
    if (
      !booking.booking_source ||
      booking.booking_source.toUpperCase() !== "WEB"
    ) {
      return;
    }

    // ==============================
    // ASAP YA SCHEDULE CHECK
    // ==============================

    let bookingType = "SCHEDULE";

    try {
      const now = new Date();

      const pickupDateTime = new Date(
        `${booking.pickup_date} ${booking.pickup_time}`,
      );

      // Agar booking next 10 minutes ke andar hai => ASAP
      const diffMinutes = (pickupDateTime - now) / (1000 * 60);

      if (diffMinutes <= 10) {
        bookingType = "ASAP";
      }
    } catch (err) {
      console.log("❌ Error detecting booking type:", err);
    }

    // ==============================
    // DASHBOARD TOKENS
    // ==============================

    const res = await pool.query(`
      SELECT web_device_id
      FROM employees
      WHERE role_id = 1
      AND web_device_id IS NOT NULL
      AND web_device_id != ''
    `);

    const tokens = res.rows.map((r) => r.web_device_id);

    if (tokens.length === 0) {
      console.log("⚠️ No dashboard FCM tokens found");
      return;
    }

    // ==============================
    // NOTIFICATION PAYLOAD
    // ==============================

    const message = {
      tokens,

      notification: {
        title: `New ${bookingType} Web Booking`,
        body: `${booking.pickup} → ${booking.dropoff}`,
      },

      data: {
        type: "NEW_WEB_BOOKING",
        booking_mode: bookingType,
        // booking_id: String(booking.id),
        booking_id: "1234",
      },
    };

    // ==============================
    // SEND
    // ==============================
    console.log("Web Booking Notification Data:", message);
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log("FCM RESPONSE:", JSON.stringify(response, null, 2));
    console.log(
      `✅ Web booking notification sent: ${response.successCount} success`,
    );
  } catch (err) {
    console.error("❌ sendWebBookingNotification Error:", err);
  }
}

module.exports = {
  sendBookingNotification,
  sendFOBBookingNotification,
  sendRideAcceptedNotification,
  sendPanicDriverNotification,
  sendOnBreakDriverNotification,
  sendBreakStatusNotification,
  sendRecoverBookingNotification,
  sendAppBookingNotification,
  sendFutureBookingNotification,
  sendWebBookingNotification
};
