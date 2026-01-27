const express = require("express");
const router = express.Router();
const controller = require("../controllers/callEventController");
const verifyVipVoipToken = require("../middlewares/verifyVipVoipToken");

router.post(
  "/receivecallevents",
  verifyVipVoipToken,
  controller.receiveCallEvents,
);

router.get("/getcallevents", controller.getCallEvents);
router.delete("/deletecallevents", controller.deleteCallEvents);

module.exports = router;
