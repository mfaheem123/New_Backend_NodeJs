const crypto = require("crypto");

function generateSecurityCode() {
  return crypto.randomInt(1000, 10000).toString();
}

// Validating OTP Code
function validateSecurityCode(code) {
  return typeof code === "string" && /^\d{4}$/.test(code); // strictly 4-digit numeric string
}

module.exports = {
  generateSecurityCode,
  validateSecurityCode,
};
