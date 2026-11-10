const AuditModel = require('../models/auditModel');

class AuditController {
    static async getAudits(req, res) {
        try {
            const bookingId = req.query.booking_id;

            if (!bookingId) {
                return res.status(400).json({
                    status: false,
                    message: "booking_id query parameter is required."
                });
            }

            const audits = await AuditModel.getAuditsByBookingId(bookingId);

            return res.status(200).json({
                status: true,
                count: audits.length,
                audits: audits
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({
                status: false,
                message: "Internal server error",
                error: error.message
            });
        }
    }
}

module.exports = AuditController;