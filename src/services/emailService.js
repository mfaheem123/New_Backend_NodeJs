const transporter = require("../config/emailConfig"); // Ya jahan aapki emailConfig file ho
const { getTemplateById } = require("./templateService");
const { parseTemplate } = require("../utils/templateParser"); // Ya jahan parser rakha ho

/**
 * DB se Template ID ke mutabiq Email send karne ka function
 */
async function sendEmailWithTemplate({ template_id, to, data }) {
  try {
    if (!to) {
      console.log("⚠️ Receiver email missing, skipping email dispatch.");
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

    // 3. Email send karo
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html: htmlContent, // HTML render karne ke liye
    });

    console.log("📩 Email successfully sent:", info.response);
    return info;
  } catch (error) {
    console.error("❌ Email Service Error:", error);
    // Error log kar rahe hain taake booking process roll back na ho
  }
}

module.exports = { sendEmailWithTemplate };
