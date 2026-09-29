const { sendEmail } = require("../config/emailConfig");
const { getTemplateById } = require("./templateService");
const { parseTemplate } = require("../utils/templateParser");
const companyConfiguration = require("../models/companyConfigurationModel"); // 🔹 Added

/**
 * DB se Template ID aur Subsidiary ID ke mutabiq Dynamic Email send karne ka function
 */
async function sendEmailWithTemplate({ subsidiaryId, company_id, template_id, to, data }) {
  try {
    if (!to) {
      console.log("⚠️ Receiver email missing, skipping email dispatch.");
      return;
    }

    // 🔹 Fallback: Agar subsidiaryId missing ho to company_id se first subsidiary nikalein
    let activeSubsidiaryId = subsidiaryId;
    if (!activeSubsidiaryId && company_id) {
      activeSubsidiaryId = await companyConfiguration.getFirstSubsidiaryByCompanyId(company_id);
    }

    // Default fallback agar phir bhi na mile
    if (!activeSubsidiaryId) {
      activeSubsidiaryId = 1; 
    }

    // 1. Database se template fetch karo
    const template = await getTemplateById(template_id);
    if (!template) {
      console.error(`❌ Email Template ID ${template_id} DB mein nahi mila.`);
      return;
    }

    // 2. Subject aur Content parser mein pass karo
    const subject = parseTemplate(
      template.subject || "Booking Confirmation",
      data,
    );
    const htmlContent = parseTemplate(template.content || "", data);

    // 3. Dynamic sendEmail function ke zariye email send karo
    const info = await sendEmail({
      subsidiaryId: activeSubsidiaryId,
      to,
      subject,
      html: htmlContent,
    });

    console.log("📩 Email successfully sent:", info?.response || info);
    return info;
  } catch (error) {
    console.error("❌ Email Service Error:", error);
  }
}

module.exports = { sendEmailWithTemplate };