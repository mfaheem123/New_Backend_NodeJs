// controllers/matrixController.js
const MatrixModel = require('../models/matrixModel');

class MatrixController {
    static async fetchMatrixData(req, res) {
        try {
            const matrixData = await MatrixModel.getZoneAvailabilityMatrix();

            return res.status(200).json({
                success: true,
                message: "Zone availability matrix fetched successfully",
                data: matrixData
            });
        } catch (error) {
            console.error('Controller Error fetching matrix:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal Server Error',
                error: error.message
            });
        }
    }
}

module.exports = MatrixController;