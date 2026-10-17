const {
  sendSMSWithTemplate,
  fetchSMSLogsService,
} = require("../services/smsService");

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

// 📌 NAYA CONTROLLER FUNCTION
async function getMessages(req, res) {
  try {
    const result = await fetchSMSLogsService(req.query);

    res.json({
      status: true,
      count: result.count,
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
