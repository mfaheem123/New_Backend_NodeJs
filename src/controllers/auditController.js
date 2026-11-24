const AuditModel = require("../models/auditModel");

class AuditController {
  // ---------------------------------------------------------
  // GET AUDITS BY BOOKING ID OR DRIVER ID
  // ---------------------------------------------------------
  static async getAudits(req, res) {
    try {
      const { booking_id: bookingId, driver_id: driverId, type } = req.query;

      if (type === "driver" || (driverId && !bookingId)) {
        if (!driverId) {
          return res.status(400).json({
            status: false,
            message: "driver_id query parameter is required.",
          });
        }

        const audits = await AuditModel.getAuditsByDriverId(
          driverId,
          type || "driver"
        );

        return res.status(200).json({
          status: true,
          count: audits.length,
          audits,
        });
      }

      if (!bookingId) {
        return res.status(400).json({
          status: false,
          message: "booking_id or driver_id query parameter is required.",
        });
      }

      const audits = await AuditModel.getAuditsByBookingId(bookingId);

      return res.status(200).json({
        status: true,
        count: audits.length,
        audits,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        status: false,
        message: "Internal server error",
        error: error.message,
      });
    }
  }
}

module.exports = AuditController;


