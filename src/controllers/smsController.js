const { sendSMSWithTemplate } = require("../services/smsService");

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

module.exports = { sendSMS };