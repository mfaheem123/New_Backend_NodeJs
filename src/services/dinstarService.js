const httpClient = require("urllib");
const dinstarConfig = require("../config/dinstarConfig");

async function sendViaDinstar(number, text, port, config) {
  try {
// 📌 DB se direct sms_host aur sms_port lena, agar na ho toh fallback use karna
    const url = config?.sms_host || "https://217.40.112.65/api/send_sms";

    // Agar function mein port pass na ho toh DB wale `sms_port` ko number mein convert kar ke use karein, warna default 5 rahe
    //pehle config wala port aye agar wo na ho tou phr function wala port aye agar wo na ho tou phr default 5 aye

    const activePort = config?.sms_port ? parseInt(config.sms_port, 10) : port || 5;

    const username = config?.sms_username || process.env.DINSTAR_USER;
    const password = config?.sms_password || process.env.DINSTAR_PASS;

    const options = {
      method: "POST",
      rejectUnauthorized: false,

      // ✅ Digest Authentication
digestAuth: `${username}:${password}`,

      content: JSON.stringify({
        text: "#param#",
        port: [activePort],
        param: [
          {
            number: number,
            text_param: [text],
            user_id: 1,
          },
        ],
      }),

      headers: {
        "Content-Type": "application/json",
      },
    };

    const response = await httpClient.request(url, options);
    console.log(
      "--------------------------------------------------------------------------------------------------------",
    );

    console.log(response);
    console.log(
      "--------------------------------------------------------------------------------------------------------",
    );

    const responseData = response.data ? response.data.toString() : null;

    return {
      success: true,
      statusCode: response.status,
      data: responseData,
    };
  } catch (error) {
    console.error("Dinstar Error:", error.message);

    return {
      success: false,
      error: error.message,
    };
  }
}

module.exports = { sendViaDinstar };
