const nodemailer = require("nodemailer");
require("dotenv").config();
const companyConfiguration = require("../models/companyConfigurationModel");

//CONFIG USING ENV VARIABLES
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Subsidiary ID ke zariye database se credentials fetch karke Nodemailer transporter banata hai.
 */
const createDynamicTransporter = async (subsidiaryId) => {
  const configResponse = await companyConfiguration.getById(subsidiaryId);

  // Checking response structure (agar response direct object ho ya status wrapped ho)
  const config = configResponse?.company_configuration || configResponse;

  if (!config || !config.email_username || !config.email_password) {
    throw new Error(
      `Email configuration not found for Subsidiary ID: ${subsidiaryId}`,
    );
  }

  // Database values ke sath transporter configuration
  return nodemailer.createTransport({
    host: config.email_host || "smtp.gmail.com",
    port: Number(config.email_port) || 465,
    secure: Boolean(config.email_secure_connection), // Port 465 ke liye true aur 587 ke liye false[cite: 1]
    auth: {
      user: config.email_username,
      pass: config.email_password,
    },
  });
};

//SEND EMAIL USING ENV VARIABLES
const sendEmail = async (to, subject, text) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
    });

    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
};

/**
 * Dynamic email bhejne ka function[cite: 1]
 */
// const sendEmail = async ({ subsidiaryId, to, subject, text, html }) => {
//   try {
//     const configResponse = await companyConfiguration.getById(subsidiaryId);
//     const config = configResponse?.company_configuration || configResponse;

//     if (!config) {
//       throw new Error(`No configuration found for subsidiary ID: ${subsidiaryId}`);
//     }

//     // Dynamic transporter initialize karen[cite: 1]
//     const transporter = nodemailer.createTransport({
//       host: config.email_host,
//       port: Number(config.email_port),
//       secure: Boolean(config.email_secure_connection),
//       auth: {
//         user: config.email_username,
//         pass: config.email_password,
//       },
//     });

//     // Email send options[cite: 1]
//     const mailOptions = {
//       from: `"${config.subsidiary_name || 'Support'}" <${config.email_username}>`,
//       to,
//       cc: config.email_cc || undefined, // Database wala CC mail yahan set hoga[cite: 1]
//       subject,
//       text,
//       html,
//     };

//     const info = await transporter.sendMail(mailOptions);
//     console.log("Email sent successfully:", info.response);
//     return info;

//   } catch (error) {
//     console.error("Email sending error:", error);
//     throw error;
//   }
// };

module.exports = { sendEmail, transporter, createDynamicTransporter };
