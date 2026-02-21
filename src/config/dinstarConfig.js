module.exports = {
  baseURL: "https://217.40.112.65/api",
  auth: {
    username: process.env.DINSTAR_USER,
    password: process.env.DINSTAR_PASS,
  },
  headers: {
    "Content-Type": "application/json",
  },
};
