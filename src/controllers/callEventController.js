const CallEventModel = require("../models/callEventModel");
const { notifyCLIOpen } = require("../sockets/cliWebSocket");
// const { getIO } = require("../sockets/io");
// const io = getIO();

function normalizeStatus(status) {
  if (!status) return null;

  switch (status.toUpperCase()) {
    case "RINGING":
      return "Ringing";
    case "IN_USE":
    case "IN USE":
      return "In use";
    case "IDLE":
      return "Idle";
    default:
      return null;
  }
}

exports.receiveCallEvents = async (req, res) => {
  try {
    const { token, events } = req.body;
    console.log(
      "🚀 INCOMING CALL EVENT BODY:",
      JSON.stringify(req.body, null, 2),
    );

    if (!token || !Array.isArray(events)) {
      return res.status(400).json({
        message: "Invalid payload. Token and events array are required.",
      });
    }

    // 1️⃣ Create batch
    const batchId = await CallEventModel.createBatch(token);

    // 2️⃣ Process events one by one
    for (const event of events) {
      const normalizedStatus = normalizeStatus(event.status);

      if (!normalizedStatus) {
        console.warn("❌ Invalid status received:", event.status);
        continue; // skip invalid event
      }

      // 🔹 Save event and get saved record
      const savedEvent = await CallEventModel.insertSingleEvent(batchId, {
        ...event,
        status: normalizedStatus,
      });

      // 🔥 CLI ONLY ON FIRST IN_USE
      if (normalizedStatus === "In use" && savedEvent.cli_triggered === false) {
        notifyCLIOpen(event.extension, {
          callId: event.callId,
          callerId: event.callerId,
          extension: event.extension,
        });

        // const payload = {
        //   callId: event.callId,
        //   callerId: event.callerId,
        //   extension: event.extension,
        // }

        // notifyCLIOpen(io, event.extension, payload);

        // 3️⃣ Mark as triggered
        await CallEventModel.markCliTriggered(savedEvent.id);
      }
    }

    res.status(200).json({
      message: "Call Events Saved Successfully.",
      batchId,
    });
  } catch (error) {
    console.error("receiveCallEvents error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getCallEvents = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Token is required." });
    }

    const events = await CallEventModel.getEventsByToken(token);

    if (events.length === 0) {
      return res.status(404).json({
        message: "No call events found for this token.",
      });
    }

    res.status(200).json({
      message: "Call events retrieved successfully.",
      data: events,
    });
  } catch (error) {
    console.error("getCallEvents error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteCallEvents = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "Token is Required." });
    }

    const deleted = await CallEventModel.deleteEventsByToken(token);

    if (deleted === 0) {
      return res.status(404).json({
        message: "No call events found for this token.",
      });
    }

    res.status(200).json({
      message: "Call Events Deleted Successfully.",
    });
  } catch (error) {
    console.error("deleteCallEvents error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
