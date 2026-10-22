const EmailLogModel = require("../models/emailLogModel");

const getEmailLogs = async (req, res) => {
  try {
    const { 
      company_id, 
      limit = 25, 
      page = 1, 
      offset, 
      email, 
      subject, 
      content, 
      status, 
      date, 
      time 
    } = req.query;

    if (!company_id) {
      return res
        .status(400)
        .json({ status: false, message: "company_id is required" });
    }

    const parsedLimit = Number(limit);
    // Agar offset diya hai toh woh use ho, warna page number se offset calculate ho jaye
    const parsedOffset = offset !== undefined 
      ? Number(offset) 
      : (Number(page) - 1) * parsedLimit;

    // Filters object for searching on columns
    const filters = {
      email: email || null,
      subject: subject || null,
      content: content || null,
      status: status || null,
      date: date || null,
      time: time || null,
    };

    const { emails, totalCount } = await EmailLogModel.getByCompany({
      companyId: Number(company_id),
      limit: parsedLimit,
      offset: parsedOffset,
      filters,
    });

    const totalPages = Math.ceil(totalCount / parsedLimit);
    const currentPage = Math.floor(parsedOffset / parsedLimit) + 1;

    return res.status(200).json({
      status: true,
      count: totalCount,
      totalPages: totalPages,
      currentPage: currentPage,
      limit: parsedLimit,
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