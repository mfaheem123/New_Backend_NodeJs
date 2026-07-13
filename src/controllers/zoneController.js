const Zone = require("../models/zoneModel");

const zoneController = {
  // CREATE
  createZone: async (req, res) => {
    try {
      console.log(
        "🚀 INCOMING ADD ZONE BODY:",
        JSON.stringify(req.body, null, 2),
      );
      const zone = await Zone.create(req.body);
      res.status(200).json({
        status: true,
        message: "Zone created successfully",
        zone,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  // READ ALL
  getAllZones: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 100,
        name,
        secondary_name,
        type,
        category,
        company_id,
      } = req.query;

      const { zones, total } = await Zone.getAll({
        page: Number(page),
        limit: Number(limit),
        name,
        secondary_name,
        type,
        category,
        company_id,
      });

      res.json({
        status: true,
        page: Number(page),
        limit: Number(limit),
        total,
        total_pages: Math.ceil(total / limit),
        count: zones.length,
        zones,
      });
    } catch (err) {
      console.error("Error fetching zones:", err);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  // READ BY ID
  getZoneById: async (req, res) => {
    try {
      const { id } = req.params;
      const zone = await Zone.getById(id);
      if (!zone) {
        return res
          .status(404)
          .json({ status: false, message: "Zone not found" });
      }
      res.json({ status: true, zone });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  // UPDATE
  updateZone: async (req, res) => {
    try {
      console.log(
        "🚀 INCOMING UPDATE ZONE BODY:",
        JSON.stringify(req.body, null, 2),
      );
      const { id } = req.params;
      const zone = await Zone.update(id, req.body);
      if (!zone) {
        return res
          .status(404)
          .json({ status: false, message: "Zone not found" });
      }
      res.json({ status: true, message: "Zone updated successfully", zone });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },

  // DELETE
  deleteZone: async (req, res) => {
    try {
      const { id } = req.params;
      const zone = await Zone.delete(id);
      if (!zone) {
        return res
          .status(404)
          .json({ status: false, message: "Zone not found" });
      }
      res.json({ status: true, message: "Zone deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ status: false, message: "Server error" });
    }
  },
};

module.exports = zoneController;
