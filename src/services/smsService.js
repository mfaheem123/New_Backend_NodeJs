const { getTemplateById, getCompanyTemplateByName } = require("./templateService");
const { parseTemplate } = require("../utils/templateParser");
const { formatMobile } = require("../utils/formatMobile");
const { sendViaDinstar } = require("./dinstarService");
const { createSMSLog, getSMSLogs } = require("../models/smsLogModel");
const { getByCompanyId } = require("../models/companyConfigurationModel");

async function sendSMSWithTemplate(payload) {
const {
    template_id,
    template_name, // ✅ Naya option
    mobile,
    data,
    port,
    company_id,
    custom_message,
  } = payload;

if (!mobile) {
     throw new Error("Mobile number is required");
  }

  // 1️⃣ Format Mobile
  const formattedMobile = formatMobile(mobile);
  console.log("Formatted Mobile No. : ", formattedMobile);

// 2️⃣ Fetch Company SMS Configuration Dynamically from DB
let companyConfig = null;
if (company_id) {
  companyConfig = await getByCompanyId(company_id);
}

  let message = "";
  let resolvedTemplateId = template_id || null;

// Agar direct message diya hai toh woh use hoga, warna template se banega
if (custom_message) {
    message = custom_message;
  } else if (template_id) {
    const template = await getTemplateById(template_id);
    if (!template) throw new Error("Template not found");
    message = parseTemplate(template.content, data);
  } else if (template_name) {
    // ✅ Dynamic template lookup by company_id + template_name
    const template = await getCompanyTemplateByName(company_id, template_name);
    if (!template) {
      throw new Error(
        `Template "${template_name}" not found for company_id: ${company_id}`
      );
    }
    resolvedTemplateId = template.id;
    message = parseTemplate(template.content, data);
  } else {
    throw new Error(
      "Either template_id, template_name, or custom_message is required"
    );
  }






 console.log("--------------------------------------------------------------------------------");
  console.log("MESSAGE TO SEND: ", message);
  console.log("--------------------------------------------------------------------------------");

  // // 4️⃣ Send via Dinstar
  // const gatewayResponse = await sendViaDinstar(formattedMobile, message, port, companyConfig);

  // // 5️⃣ Save Log in DB (resolvedTemplateId use karein taake log mein sahi ID save ho)
  // await createSMSLog({
  //   company_id,
  //   template_id: resolvedTemplateId,
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
