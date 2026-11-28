const {
  getTemplateById,
  getCompanyTemplateByName,
} = require("./templateService");
const { parseTemplate } = require("../utils/templateParser");
const { formatMobile } = require("../utils/formatMobile");
const { sendViaDinstar } = require("./dinstarService");
const { createSMSLog, getSMSLogs } = require("../models/smsLogModel");
const { getByCompanyId } = require("../models/companyConfigurationModel");

// Helper: stringified array, array, ya comma-separated string ko clean mobile list mein badalta hai
function parseMobileList(mobile) {
  if (Array.isArray(mobile)) {
    return mobile;
  }
  if (typeof mobile === "string") {
    const trimmed = mobile.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed;
    }
    return trimmed.split(",");
  }
  return [];
}

async function sendSMSWithTemplate(payload) {
  const {
    template_id,
    template_name,
    mobile,
    data,
    port,
    company_id,
    custom_message,
  } = payload;

  if (!mobile) {
    throw new Error("Mobile number is required");
  }

  const rawMobiles = parseMobileList(mobile)
    .map((num) => String(num || "").trim())
    .filter(Boolean);

  if (rawMobiles.length === 0) {
    throw new Error("At least one valid mobile number is required");
  }

  // 1️⃣ Fetch Company SMS Configuration Dynamically from DB
  let companyConfig = null;
  if (company_id) {
    companyConfig = await getByCompanyId(company_id);
  }

  // 2️⃣ Resolve Message & Template ID once before looping
  let message = "";
  let resolvedTemplateId = template_id || null;

  if (custom_message) {
    message = custom_message;
  } else if (template_id) {
    const template = await getTemplateById(template_id);
    if (!template) throw new Error("Template not found");
    message = parseTemplate(template.content, data);
  } else if (template_name) {
    const template = await getCompanyTemplateByName(company_id, template_name);
    if (!template) {
      throw new Error(
        `Template "${template_name}" not found for company_id: ${company_id}`,
      );
    }
    resolvedTemplateId = template.id;
    message = parseTemplate(template.content, data);
  } else {
    throw new Error(
      "Either template_id, template_name, or custom_message is required",
    );
  }

  console.log(
    "--------------------------------------------------------------------------------",
  );
  console.log("MESSAGE TO SEND: ", message);
  console.log(
    "--------------------------------------------------------------------------------",
  );

  const results = [];

  // 3️⃣ Har mobile number ke liye alag SMS send karein aur alag log save karein
  for (const rawNum of rawMobiles) {
    const formattedMobile = formatMobile(rawNum);
    console.log("Formatted Mobile No. : ", formattedMobile);

    try {
      // const gatewayResponse = await sendViaDinstar(
      //   formattedMobile,
      //   message,
      //   port,
      //   companyConfig
      // );

      // const isSent = Boolean(gatewayResponse && gatewayResponse.success);
      const isSent = true;

      await createSMSLog({
        company_id,
        template_id: resolvedTemplateId,
        mobile: formattedMobile,
        message,
        status: isSent ? "SENT" : "FAILED",
        // gateway_response: JSON.stringify(gatewayResponse || {}),
      });

      results.push({
        mobile: formattedMobile,
        status: isSent ? "SENT" : "FAILED",
        // gateway: gatewayResponse,
      });
    } catch (err) {
      console.error(`❌ SMS failed for ${formattedMobile}:`, err.message);

      await createSMSLog({
        company_id,
        template_id: resolvedTemplateId,
        mobile: formattedMobile,
        message,
        status: "FAILED",
        gateway_response: JSON.stringify({ error: err.message }),
      });

      results.push({
        mobile: formattedMobile,
        status: "FAILED",
        error: err.message,
      });
    }
  }

  const sentCount = results.filter((r) => r.status === "SENT").length;
  const failedCount = results.filter((r) => r.status === "FAILED").length;

  if (sentCount === 0) {
    const firstError =
      results[0]?.error ||
      results[0]?.gateway?.message ||
      "Failed to send SMS to all recipients";
    const err = new Error(firstError);
    err.results = results;
    throw err;
  }

  return {
    total: results.length,
    sentCount,
    failedCount,
    results,
  };
}

// 📌 NAYA SERVICE FUNCTION
async function fetchSMSLogsService(query) {
  const limit = parseInt(query.limit, 10) || 25;
  const page = parseInt(query.page, 10) || 1;
  // Page se offset automatically calculate ho jayega
  const offset = (page - 1) * limit;
  const company_id = query.company_id ? parseInt(query.company_id, 10) : null;

  // Frontend filters / search fields
  const filters = {
    search: query.search || null,
    number: query.number || null,
    sms: query.sms || null,
    date: query.date || null,
    time: query.time || null,
    status: query.status || null,
  };

  const data = await getSMSLogs(limit, offset, company_id, filters);

  // Pagination Calculations
  const totalPages = Math.ceil(data.count / limit);
  const currentPage = page;

  return {
    status: true,
    count: data.count, // Total records count
    totalPages: totalPages, // Kul pages kitne hain
    currentPage: currentPage, // Aap kis page par hain
    limit: limit, // Ek page par kitne records hain
    messages: data.messages,
  };
}

module.exports = {
  sendSMSWithTemplate,
  fetchSMSLogsService,
};
