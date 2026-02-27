function formatMobile(mobile) {
  if (!mobile) return "";

  // Remove all non-digit characters
  mobile = mobile.toString().replace(/\D/g, "");

  // If starts with 0 (UK local format)
  if (mobile.startsWith("0")) {
    return "44" + mobile.substring(1);
  }

  // If already starts with 44
  if (mobile.startsWith("44")) {
    return mobile;
  }

  // If user enters number without 0 (e.g. 7123456789)
  if (mobile.length === 10) {
    return "44" + mobile;
  }

  return mobile;
}

module.exports = { formatMobile };
