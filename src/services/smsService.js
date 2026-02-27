const { getTemplateById } = require("./templateService");
const { parseTemplate } = require("../utils/templateParser");
const { formatMobile } = require("../utils/formatMobile");
const { sendViaDinstar } = require("./dinstarService");
const { createSMSLog } = require("../models/smsLogModel");

async function sendSMSWithTemplate(payload) {
  const { template_id, mobile, data, port } = payload;

  // 1️⃣ Get Template
  const template = await getTemplateById(template_id);
  if (!template) throw new Error("Template not found");

  // 2️⃣ Format Mobile
  const formattedMobile = formatMobile(mobile);
  console.log("Formatted Mobile No. : ", formattedMobile)

  // 3️⃣ Parse Template
  const message = parseTemplate(template.content, data);

  console.log("MESSAGE SENT: ", message)

  // // 4️⃣ Send via Dinstar
  // const gatewayResponse = await sendViaDinstar(
  //   formattedMobile,
  //   message,
  //   port
  // );

  // // 5️⃣ Save Log in DB
  // await createSMSLog({
  //   template_id,
  //   mobile: formattedMobile,
  //   message,
  //   status: gatewayResponse.success ? "SENT" : "FAILED",
  //   gateway_response: JSON.stringify(gatewayResponse),
  // });

  // return gatewayResponse;
}

module.exports = { sendSMSWithTemplate };