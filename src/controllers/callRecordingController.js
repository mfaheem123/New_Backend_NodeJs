const CallRecordingModel = require("../models/callRecordingModel");
const CompanyClientModel = require("../models/companyClientModel");

// Subsidiary Controller ki tarah BASE_URL define karein
const BASE_URL = process.env.BASE_URL || "http://192.168.110.5:5000/uploads/";

exports.handleWebhook = async (req, res) => {
  try {
    console.log(
      "🚀 INCOMING CALL RECORDING BODY:",
      JSON.stringify(req.body, null, 2),
    );

    const uploadedFile =
      req.files && req.files.length > 0 ? req.files[0] : req.file;

    // 🖼️ URL Construction (Subsidiary format ke mutabiq)
    let completeFilePath = null;

    if (uploadedFile) {
      completeFilePath = `${BASE_URL}${uploadedFile.filename}`;
    } else if (req.body.filename) {
      // Agar filename body se aa raha ho
      const cleanFilename = req.body.filename
        .split("/")
        .pop()
        .split("\\")
        .pop();
      completeFilePath = `${BASE_URL}${cleanFilename}`;
    } else if (req.body.file_path) {
      const cleanFilename = req.body.file_path
        .split("/")
        .pop()
        .split("\\")
        .pop();
      completeFilePath = `${BASE_URL}${cleanFilename}`;
    }

    const source = req.body.source;
    const destination = req.body.destination;

    // Company Search by Phone Number
    let company = await CompanyClientModel.findCompanyByPhone(source);
    if (!company) {
      company = await CompanyClientModel.findCompanyByPhone(destination);
    }

    // Har key variant ko fallback ke sath bind karein (camelCase, snake_case aur VoIP API format)
    const payload = {
      company_id: company ? company.id : null,
      token:
        req.body.authenticationToken ||
        req.body.authentication_token ||
        req.body.token,
      event_type: req.body.eventType || req.body.event_type,
      recording_id: req.body.id || req.body.recording_id,
      call_id: req.body.callID || req.body.call_id,
      duration: req.body.duration,
      datetime: req.body.datetime || req.body.recording_datetime,
      source: source,
      destination: destination,
      is_protected: req.body.isProtected || req.body.is_protected,
      filename:
        req.body.filename || (uploadedFile ? uploadedFile.originalname : null),
      file_path: completeFilePath,
      url: req.body.url || req.body.remote_url,
    };

    const savedRecord = await CallRecordingModel.create(payload);

    return res.status(200).json({
      status: "success",
      message: "Call recording stored successfully",
      company_matched: company
        ? company.company_name
        : "No matching active company found",
      data: savedRecord,
    });
  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).json({ status: "error", message: error.message });
  }
};

// 📥 GET Call Recordings API
exports.getCallRecordings = async (req, res) => {
  try {
    const {
      offset = 0,
      limit = 15,
      mobile,
      from_date,
      to_date,
      company_id,
    } = req.query;

    const result = await CallRecordingModel.getRecordings({
      offset,
      limit,
      mobile,
      from_date,
      to_date,
      company_id,
    });

    return res.status(200).json({
      status: true,
      count: result.count,
      recordings: result.recordings,
    });
  } catch (error) {
    console.error("Get Call Recordings Error:", error);
    return res.status(500).json({
      status: false,
      message: "Server Error while fetching call recordings",
      error: error.message,
    });
  }
};
