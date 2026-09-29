const { sendEmail } = require("../config/emailConfig"); // Upgraded dynamic sendEmail function
const { getTemplateById } = require("./templateService");
const { parseTemplate } = require("../utils/templateParser");

/**
 * DB se Template ID aur Subsidiary ID ke mutabiq Dynamic Email send karne ka function
 */
async function sendEmailWithTemplate({ subsidiaryId, template_id, to, data }) {
  try {
    if (!to) {
      console.log("⚠️ Receiver email missing, skipping email dispatch.");
      return;
    }

    if (!subsidiaryId) {
      console.error(
        "❌ Subsidiary ID missing, cannot fetch email configurations.",
      );
      return;
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

    // 3. Dynamic sendEmail function ke zariye email send karo (DB Configuration ke sath)
    const info = await sendEmail({
      subsidiaryId,
      to,
      subject,
      html: htmlContent,
    });

    console.log("📩 Email successfully sent:", info?.response || info);
    return info;
  } catch (error) {
    console.error("❌ Email Service Error:", error);
    // Error log kar rahe hain taake booking process break/roll back na ho
  }
}

module.exports = { sendEmailWithTemplate };
