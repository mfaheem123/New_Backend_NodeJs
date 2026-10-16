const express = require("express");
const router = express.Router();
const callEventController = require("../controllers/callEventController");
const verifyVipVoipToken = require("../middlewares/verifyVipVoipToken");

router.post(
  "/receivecallevents",
  verifyVipVoipToken,
  callEventController.receiveCallEvents,
);

router.get("/getcallevents", callEventController.getCallEvents);
router.delete("/deletecallevents", callEventController.deleteCallEvents);

module.exports = router;
