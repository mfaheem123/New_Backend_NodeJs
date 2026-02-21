function formatMobile(mobile) {
  if (!mobile) return "";

  mobile = mobile.toString().replace(/\D/g, "");

  if (mobile.startsWith("0")) {
    return "92" + mobile.substring(1);
  }

  return mobile;
}

module.exports = { formatMobile };