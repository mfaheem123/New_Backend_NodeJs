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

    // 🖼️ URL Construction
    let completeFilePath = null;
    let rawFilename =
      req.body.filename || (uploadedFile ? uploadedFile.originalname : null);

    if (uploadedFile) {
      completeFilePath = `${BASE_URL}${uploadedFile.filename}`;
    } else if (rawFilename) {
      const cleanFilename = rawFilename.split("/").pop().split("\\").pop();
      completeFilePath = `${BASE_URL}${cleanFilename}`;
    } else if (req.body.file_path) {
      const cleanFilename = req.body.file_path
        .split("/")
        .pop()
        .split("\\")
        .pop();
      completeFilePath = `${BASE_URL}${cleanFilename}`;
    }

    let source = req.body.source;
    let destination = req.body.destination;

    // 1. Filename se Main Trunk/Office Phone Number Extract karein (Agar Filename mojood ho)
    let extractedPhoneNumbers = [];
    if (rawFilename) {
      // Filename se tamam 10-13 digit wale numbers nikalega (e.g. 442036030511, 07590455507)
      const matches = rawFilename.match(/(?:44|0)[0-9]{9,11}/g);
      if (matches) {
        extractedPhoneNumbers = matches;
      }
    }

    // 2. Matching ke liye saare Possible Numbers combine karein
    const candidateNumbers = [
      source,
      destination,
      ...extractedPhoneNumbers,
    ].filter(Boolean); // NULL / Undefined remove karne ke liye

    // 3. Company Match Logic with Fallback Array
    let company = null;
    for (const phone of candidateNumbers) {
      if (!phone) continue;

      // Direct Match Check
      company = await CompanyClientModel.findCompanyByPhone(phone);

      // Agar direct match na mile to '44' ko '0' se strip karke try karein (UK Format handling)
      if (!company && phone.startsWith("44")) {
        const localFormat = "0" + phone.slice(2);
        company = await CompanyClientModel.findCompanyByPhone(localFormat);
      }

      // Agar Company mil gayi to Loop break kar dein
      if (company) break;
    }

    // 4. Payload for Model
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
      filename: rawFilename,
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
      page,
      limit = 20,
      offset,
      mobile,
      from_date,
      to_date,
      company_id,
    } = req.query;

    const parsedLimit = parseInt(limit, 10) || 15;

    // Support both page-based and offset-based query
    let calculatedOffset = parseInt(offset, 10);
    if (isNaN(calculatedOffset)) {
      const parsedPage = parseInt(page, 10) || 1;
      calculatedOffset = (parsedPage - 1) * parsedLimit;
    }

    const result = await CallRecordingModel.getRecordings({
      offset: calculatedOffset,
      limit: parsedLimit,
      mobile,
      from_date,
      to_date,
      company_id,
    });

    return res.status(200).json({
      status: true,
      pagination: {
        totalItems: result.count,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        limit: result.limit,
        offset: result.offset,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage,
      },
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
