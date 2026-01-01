const axios = require("axios");
const dinstarConfig = require("../config/dinstarConfig");
const httpClient = require("urllib");

// Send SMS
async function sendSMS(number, text, port) {
  // If port is null or undefined, default to 7
  port = port ?? 7;
  try {
    const url = "https://217.40.112.65/api/send_sms";
    const options = {
      method: "POST",
      rejectUnauthorized: false,
      // auth: "username:password" use it if you want simple auth
      digestAuth: `${dinstarConfig.auth.username}:${dinstarConfig.auth.password}`,
      content: JSON.stringify({
        text: "#param#",
        port: [port],
        param: [
          {
            number: number,
            text_param: [text],
            user_id: 1,
          },
        ],
      }),
      headers: {
        //'Content-Type': 'application/xml'  //use it if payload is xml
        "Content-Type": "application/json", //use it if payload is json
        // 'Content-Type': 'application/text'
      },
    };
    console.log("data");
    const response = await httpClient.request(url, options);
    // console.log(response);
    // const response = await axios.post(
    //   `${dinstarConfig.baseURL}/send_sms`,
    //   {
    //     text,
    //     param: [{ number }],
    //   },
    //   { auth: dinstarConfig.auth, headers: dinstarConfig.headers }
    // );
    // return response.data;
  } catch (error) {
    console.error("Error sending SMS:", error.message);
    throw new Error("Failed to send SMS");
  }
}

// Log SMS
// const fs = require("fs");
// const path = require("path");
// const logFilePath = path.join(__dirname, "../data/logs.json");

// function logSMS(to, text) {
//   const logs = JSON.parse(fs.readFileSync(logFilePath, "utf8"));
//   logs.push({ to, text, timestamp: new Date().toISOString() });
//   fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
// }

module.exports = {
  sendSMS,
  // logSMS,
};
