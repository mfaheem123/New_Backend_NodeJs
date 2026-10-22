const {
  sendSMSWithTemplate,
  fetchSMSLogsService,
} = require("../services/smsService");

// ---------------------------------------------------------
// SEND SMS CONTROLLER
// ---------------------------------------------------------
async function sendSMS(req, res) {
  try {
    const result = await sendSMSWithTemplate(req.body);

    res.json({
      status: true,
      gateway: result,
    });
  } catch (error) {
    res.status(400).json({
      status: false,
      message: error.message,
    });
  }
}

// ---------------------------------------------------------
// GET ALL SMS CONTROLLER
// ---------------------------------------------------------
async function getMessages(req, res) {
  try {
    const result = await fetchSMSLogsService(req.query);

    res.json({
      status: true,
      count: result.count,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      limit: result.limit,
      messages: result.messages,
    });
  } catch (error) {
    res.status(500).json({
      status: false,
      message: error.message,
    });
  }
}

module.exports = { sendSMS, getMessages };
