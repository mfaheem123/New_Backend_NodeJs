// controllers/matrixController.js
const MatrixModel = require("../models/matrixModel");

class MatrixController {
  // ---------------------------------------------------------
  // FETCH ZONE AVAILABILITY MATRIX WITH COMPANY ID
  // ---------------------------------------------------------
  static async fetchMatrixData(req, res) {
    try {
      const { company_id } = req.query;
      const matrixData = await MatrixModel.getZoneAvailabilityMatrix(company_id);

      return res.status(200).json({
        success: true,
        message: "Zone Availability Fetched Successfully",
        total_zones: matrixData.length,
        data: matrixData,
      });
    } catch (error) {
      console.error("Controller Error fetching matrix:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error",
        error: error.message,
      });
    }
  }
}

module.exports = MatrixController;
