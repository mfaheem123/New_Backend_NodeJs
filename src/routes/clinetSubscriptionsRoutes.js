const express = require("express");
const router = express.Router();
const clinetSubscriptionsController = require("../controllers/clinetSubscriptionsController"); // Controller ka sahi relative path rakhein

// 1. Test Subscription Create/Assign karne ke liye
router.post(
  "/create-subscription",
  clinetSubscriptionsController.createTestSubscription,
);

// 2. Morning Warnings (09:00 AM Cron) ko manually trigger karne ke liye
router.post(
  "/trigger-warnings",
  clinetSubscriptionsController.triggerMorningWarnings,
);

// 3. Midnight Force Logout (00:00 AM Cron) ko manually trigger karne ke liye
router.post(
  "/trigger-logout",
  clinetSubscriptionsController.triggerMidnightLogout,
);

// 4. Grace Period dene ke liye
router.post(
  "/grace/:company_id",
  clinetSubscriptionsController.giveGracePeriod,
);
module.exports = router;
