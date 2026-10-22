const EmailLogModel = require("../models/emailLogModel");

const getEmailLogs = async (req, res) => {
  try {
    const { company_id, offset = 0, limit = 25 } = req.query;

    if (!company_id) {
      return res
        .status(400)
        .json({ status: false, message: "company_id is required" });
    }

    const { emails, totalCount } = await EmailLogModel.getByCompany({
      companyId: Number(company_id),
      limit: Number(limit),
      offset: Number(offset),
    });

    return res.status(200).json({
      status: true,
      count: totalCount,
      emails,
    });
  } catch (error) {
    console.error("❌ Get Email Logs Error:", error);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

module.exports = { getEmailLogs };
