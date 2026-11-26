const SearchModel = require("../models/searchCustomerAccountDriverModel");

const searchContacts = async (req, res) => {
  try {
    const { company_id, type, mobile, email, q, search } = req.query;

    if (!company_id) {
      return res.status(400).json({
        status: false,
        message: "company_id is required",
      });
    }

    if (!type) {
      return res.status(400).json({
        status: false,
        message: "type is required (customer, account, driver)",
      });
    }

    const data = await SearchModel.searchRecords({
      company_id,
      type,
      mobile,
      email,
      query: q || search,
    });

    return res.status(200).json({
      status: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("❌ Search API Error:", error);

    if (error.message.startsWith("Invalid type")) {
      return res.status(400).json({
        status: false,
        message: error.message,
      });
    }

    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

module.exports = { searchContacts };