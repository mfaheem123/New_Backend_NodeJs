const AirportService = require("../services/airportService");

class AirportController {
  // GET LIST
  static async getAirports(req, res) {
    try {
      const data = await AirportService.getAllAirports();

      res.json({
        status: true,
        count: data.length,
        locations: data,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  }

  // UPDATE
  static async updateAirport(req, res) {
    try {
      const id = req.params.id;
      const updated = await AirportService.updateAirport(id, req.body);

      res.json({
        status: true,
        message: "Airport charges updated",
        location: updated,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  }

  // DELETE
  static async deleteAirport(req, res) {
    try {
      const id = req.params.id;
      const deleted = await AirportService.deleteAirport(id);

      res.json({
        status: true,
        message: "Airport deleted",
        deleted,
      });
    } catch (err) {
      res.status(500).json({
        status: false,
        message: err.message,
      });
    }
  }

  static async clearCharges(req, res) {
    try {
      const id = req.params.id;

      const updated = await AirportService.clearCharges(id);

      res.json({
        status: true,
        message: "Airport charges cleared successfully",
        updated,
      });
    } catch (err) {
      res.status(400).json({
        status: false,
        message: err.message,
      });
    }
  }
}

module.exports = AirportController;
