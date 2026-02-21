const MAX_DIGITS = "1";
const WAIT_MS = "10000";

exports.waitForKeypress = (text) => ({
  errorCode: 0,
  nextAction: "WaitForKeyPress",
  audioPrompt: { text, interruptible: true },
  maxDigits: MAX_DIGITS,
  wait: WAIT_MS,
});

exports.transfer = (number, msg = "Please hold while we transfer your call.") => ({
  errorCode: 0,
  nextAction: "Transfer",
  audioPrompt: { text: msg, interruptible: false },
  transferTo: number,
});

exports.hangup = (msg = "Goodbye.") => ({
  errorCode: 0,
  nextAction: "Hangup",
  audioPrompt: { text: msg, interruptible: false },
});

exports.formatMobile = (num = "") => {
  num = num.replace(/\D/g, "");
  if (num.startsWith("44")) return "0" + num.slice(2);
  if (!num.startsWith("0") && num.length === 10) return "0" + num;
  return num;
};
