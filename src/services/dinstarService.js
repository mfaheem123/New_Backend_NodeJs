const httpClient = require("urllib");
const dinstarConfig = require("../config/dinstarConfig");

async function sendViaDinstar(number, text, port) {
  try {
    // port = port ?? 7;
    port = 5;
    const url = `${dinstarConfig.baseURL}/send_sms`;

    const options = {
      method: "POST",
      rejectUnauthorized: false,

      // ✅ Digest Authentication
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

      headers: dinstarConfig.headers,
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
