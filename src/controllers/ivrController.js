const ivrService = require("../services/ivrService");

exports.mainIvr = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING IVR MAIN BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const response = await ivrService.handleMainIvr(req.body);
    return res.json(response);
  } catch (err) {
    console.error("Main IVR Error:", err);
    return res.status(500).json(ivrService.hangup("System error. Goodbye."));
  }
};

exports.fallbackIvr = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING IVR FALLBACK BODY:",
      JSON.stringify(req.body, null, 2),
    );
    const response = await ivrService.handleFallbackIvr(req.body);
    return res.json(response);
  } catch (err) {
    console.error("Fallback IVR Error:", err);
    return res.status(500).json(ivrService.hangup("System error. Goodbye."));
  }
};
