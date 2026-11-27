const EmailLogModel = require("../models/emailLogModel");
const { sendEmail } = require("../config/emailConfig");

// ---------------------------------------------------------
// GET EMAIL LOGS
// ---------------------------------------------------------
const getEmailLogs = async (req, res) => {
  try {
    const {
      company_id,
      limit = 25,
      page = 1,
      offset,
      email,
      subject,
      content,
      status,
      date,
      time,
    } = req.query;

    if (!company_id) {
      return res
        .status(400)
        .json({ status: false, message: "company_id is required" });
    }

    const parsedLimit = Number(limit);
    // Agar offset diya hai toh woh use ho, warna page number se offset calculate ho jaye
    const parsedOffset =
      offset !== undefined ? Number(offset) : (Number(page) - 1) * parsedLimit;

    // Filters object for searching on columns
    const filters = {
      email: email || null,
      subject: subject || null,
      content: content || null,
      status: status || null,
      date: date || null,
      time: time || null,
    };

    const { emails, totalCount } = await EmailLogModel.getByCompany({
      companyId: Number(company_id),
      limit: parsedLimit,
      offset: parsedOffset,
      filters,
    });

    const totalPages = Math.ceil(totalCount / parsedLimit);
    const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;

    return res.status(200).json({
      status: true,
      count: totalCount,
      totalPages: totalPages,
      currentPage: currentPage,
      limit: parsedLimit,
      emails,
    });
  } catch (error) {
    console.error("❌ Get Email Logs Error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};


// Helper: stringified array, array, ya comma-separated string ko clean email array mein badalta hai
const parseEmailList = (to) => {
  if (Array.isArray(to)) {
    return to;
  }
  if (typeof to === "string") {
    const trimmed = to.trim();
    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    }
    return trimmed.split(",");
  }
  return [];
};

// ---------------------------------------------------------
// SEND CUSTOM EMAIL
// ---------------------------------------------------------
const sendCustomEmail = async (req, res) => {
  try {
    const { company_id, subsidiary_id, to, subject, text, html } = req.body;

    console.log(
      "🚀 INCOMING SEND CUSTOM EMAIL BODY:",
      JSON.stringify(req.body, null, 2)
    );

    if (!company_id || !subsidiary_id || !to || !subject) {
      return res.status(400).json({
        status: false,
        message:
          "company_id, subsidiary_id, to, and subject are required fields.",
      });
    }

    const recipients = parseEmailList(to)
      .map((email) => String(email || "").trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      return res.status(400).json({
        status: false,
        message: "At least one valid recipient email is required.",
      });
    }

    const results = [];

    // Har email ko alag-alag send karein
    for (const recipient of recipients) {
      try {
        const info = await sendEmail({
          companyId: company_id,
          subsidiaryId: subsidiary_id,
          to: recipient,
          subject,
          text,
          html,
        });

        results.push({
          email: recipient,
          status: "sent",
          messageId: info?.messageId || null,
        });
      } catch (err) {
        console.error(`❌ Failed sending email to ${recipient}:`, err.message);
        results.push({
          email: recipient,
          status: "failed",
          error: err.message,
        });
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return res.status(200).json({
      status: sentCount > 0,
      message: `Processed ${recipients.length} email(s): ${sentCount} sent, ${failedCount} failed.`,
      sentCount,
      failedCount,
      results,
    });
  } catch (error) {
    console.error("❌ Send Custom Email Error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Internal server error while sending email",
    });
  }
};

module.exports = { getEmailLogs, sendCustomEmail };
