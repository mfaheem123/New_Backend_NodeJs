const ivrService = require("../services/ivrService");

exports.mainIvr = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING ADD IVR MAIN BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const response = await ivrService.handleMainIvr(req.body);
    return res.json(response);
  } catch (err) {
    console.error("Main IVR Error:", err);
    return res.json(ivrService.hangup("System error. Goodbye."));
  }
};

exports.fallbackIvr = async (req, res) => {
  try {
    const response = await ivrService.handleFallbackIvr(req.body);
    return res.json(response);
  } catch (err) {
    console.error("Fallback IVR Error:", err);
    return res.json(ivrService.hangup("System error. Goodbye."));
  }
};
