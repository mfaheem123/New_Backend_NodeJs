const EnumerationsModel = require("../models/enumerationsModel");

exports.getAllEnumerations = async (req, res) => {
    try {
        const data = await EnumerationsModel.getAll();

        return res.json({
            status: true,
            ...data
        });
    } catch (error) {
        console.log("Error getting enumerations:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error"
        });
    }
};
