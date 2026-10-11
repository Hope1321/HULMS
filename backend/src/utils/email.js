const nodemailer = require("nodemailer");

/**
 * Send an email.
 *
 * In development (or when SMTP is not configured) this function
 * logs the email to the console instead of sending it, so the
 * server starts and works without email credentials.
 *
 * To enable real email sending, add these to your .env:
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your@email.com
 *   SMTP_PASS=your_app_password
 *   SMTP_FROM=HULMS <your@email.com>
 */

const isConfigured =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;

let transporter = null;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * @param {Object} options
 * @param {string} options.to       - Recipient email address
 * @param {string} options.subject  - Email subject
 * @param {string} options.html     - HTML body
 * @param {string} [options.text]   - Plain-text fallback
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (!isConfigured) {
    // Development fallback — just log it
    console.log("\n📧 [Email - not sent, SMTP not configured]");
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:    ${text || "(html only)"}`);
    console.log("");
    return { messageId: "dev-mode-no-smtp" };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || `HULMS <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });

  console.log(`📧 Email sent: ${info.messageId}`);
  return info;
};

module.exports = { sendEmail };
