require("dotenv").config();

module.exports = (req, res, next) => {
  const incomingToken = req.body.token;

  if (!incomingToken) {
    return res.status(400).json({
      message: "VIP VOIP token is missing",
    });
  }

  if (incomingToken !== process.env.VIP_VOIP_TOKEN) {
    return res.status(401).json({
      message: "Invalid VIP VOIP token",
    });
  }

  next();
};
