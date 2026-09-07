const fareConfigurationMileageModel = require('../models/fareConfigurationMileageModel');

// ---------------------------------------------------------
// CREATE FARE CONFIGURATION MILEAGE
// ---------------------------------------------------------
exports.createFareConfigurationMileage = async (req, res) => {
    try {
        console.log(
            "🚀 INCOMING FARE CONFIGURATION MILEAGE ADD BODY:",
            JSON.stringify(req.body, null, 2),
        );
        const fareConfigurationMileage = await fareConfigurationMileageModel.createFareConfigurationMileage(req.body);
        
        return res.status(200).json({
      success: true,
      fareConfigurationMileage: fareConfigurationMileage,
    });
    } catch (error) {
        console.error("Error creating fare configuration mileage:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------
// GET ALL FARE CONFIGURATION MILEAGE
// ---------------------------------------------------------
exports.getAllFareConfigurationsMileage = async (req, res) => {
    try {
        const fareConfigurationsMileage = await fareConfigurationMileageModel.getAllFareConfigurationsMileage();
        res.status(200).json(fareConfigurationsMileage);
    } catch (error) {
        console.error("Error fetching fare configurations mileage:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------
// GET FARE CONFIGURATION MILEAGE BY ID
// ---------------------------------------------------------
exports.getFareConfigurationMileageById = async (req, res) => {
    try {
        const fareConfigurationMileage = await fareConfigurationMileageModel.getFareConfigurationMileageById(req.params.id);
        if (!fareConfigurationMileage) {
            return res.status(404).json({ error: "Fare configuration mileage not found" });
        }
        res.status(200).json(fareConfigurationMileage);
    } catch (error) {
        console.error("Error fetching fare configuration mileage:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------
// UPDATE FARE CONFIGURATION MILEAGE BY ID
// ---------------------------------------------------------
exports.updateFareConfigurationMileage = async (req, res) => {
    try {
        const fareConfigurationMileage = await fareConfigurationMileageModel.updateFareConfigurationMileage(req.params.id, req.body);
        if (!fareConfigurationMileage) {
            return res.status(404).json({ error: "Fare configuration mileage not found" });
        }
        res.status(200).json(fareConfigurationMileage);
    } catch (error) {
        console.error("Error updating fare configuration mileage:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

// ---------------------------------------------------------
// DELETE FARE CONFIGURATION MILEAGE BY ID
// ---------------------------------------------------------
exports.deleteFareConfigurationMileage = async (req, res) => {
    try {
        const fareConfigurationMileage = await fareConfigurationMileageModel.deleteFareConfigurationMileage(req.params.id);
        if (!fareConfigurationMileage) {
            return res.status(404).json({ error: "Fare configuration mileage not found" });
        }
        res.status(200).json({ message: "Fare configuration mileage deleted successfully" });
    } catch (error) {
        console.error("Error deleting fare configuration mileage:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

