const { searchAddressOrShortcut } = require("../services/searchService");

const searchController = async (req, res) => {
  try {
    const query = (req.query.search || "").trim().toLowerCase();

    if (!query) {
      return res
        .status(400)
        .json({ status: false, message: "search query required" });
    }

    const result = await searchAddressOrShortcut(query);
    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Search error:", err.message);
    res.status(500).json({ status: false, message: "Internal Server Error" });
  }
};

module.exports = { searchController };
