const { getTemplateById } = require("./templateService");
const { parseTemplate } = require("../utils/templateParser");
const { formatMobile } = require("../utils/formatMobile");
const { sendViaDinstar } = require("./dinstarService");
const { createSMSLog, getSMSLogs } = require("../models/smsLogModel");

async function sendSMSWithTemplate(payload) {
  const { template_id, mobile, data, port, company_id } = payload;

  // 1️⃣ Get Template
  const template = await getTemplateById(template_id);
  if (!template) throw new Error("Template not found");

  // 2️⃣ Format Mobile
  const formattedMobile = formatMobile(mobile);
  console.log("Formatted Mobile No. : ", formattedMobile);

  // 3️⃣ Parse Template
  const message = parseTemplate(template.content, data);
  // const message = "MESSAGE FROM SERVER"

  console.log(
    "--------------------------------------------------------------------------------------------------------",
  );
  console.log("MESSAGE SENT: ", message);
  console.log(
    "--------------------------------------------------------------------------------------------------------",
  );

  // // 4️⃣ Send via Dinstar
  // const gatewayResponse = await sendViaDinstar(formattedMobile, message, port);

  // // 5️⃣ Save Log in DB
  // await createSMSLog({
  //   company_id,
  //   template_id,
  //   mobile: formattedMobile,
  //   message,
  //   status: gatewayResponse.success ? "SENT" : "FAILED",
  //   gateway_response: JSON.stringify(gatewayResponse),
  // });

  // return gatewayResponse;
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

module.exports = { sendSMSWithTemplate, fetchSMSLogsService };
